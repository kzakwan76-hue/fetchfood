export const MAX_QTY = 20;

export type CartLine = { menuItemId: string; name: string; pricePkr: number; quantity: number };
export type Cart = {
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  deliveryFeePkr: number;
  minOrderPkr: number;
  lines: CartLine[];
};
export type CartRestaurant = {
  id: string;
  slug: string;
  name: string;
  deliveryFeePkr: number;
  minOrderPkr: number;
};
export type CartItem = { id: string; name: string; pricePkr: number };

export const EMPTY_CART: Cart = {
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
  deliveryFeePkr: 0,
  minOrderPkr: 0,
  lines: [],
};

// A cart holds one restaurant at a time. Adding from another restaurant starts a new cart.
export function addItem(cart: Cart, restaurant: CartRestaurant, item: CartItem): Cart {
  const base: Cart =
    cart.restaurantId === restaurant.id
      ? cart
      : {
          ...EMPTY_CART,
          restaurantId: restaurant.id,
          restaurantSlug: restaurant.slug,
          restaurantName: restaurant.name,
          deliveryFeePkr: restaurant.deliveryFeePkr,
          minOrderPkr: restaurant.minOrderPkr,
        };
  const existing = base.lines.find((l) => l.menuItemId === item.id);
  if (existing) return setQuantity(base, item.id, existing.quantity + 1);
  return {
    ...base,
    lines: [...base.lines, { menuItemId: item.id, name: item.name, pricePkr: item.pricePkr, quantity: 1 }],
  };
}

export function setQuantity(cart: Cart, menuItemId: string, quantity: number): Cart {
  if (!Number.isFinite(quantity)) return cart;
  const q = Math.min(MAX_QTY, Math.floor(quantity));
  const lines =
    q < 1
      ? cart.lines.filter((l) => l.menuItemId !== menuItemId)
      : cart.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: q } : l));
  return lines.length === 0 ? EMPTY_CART : { ...cart, lines };
}

export function itemCount(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.quantity, 0);
}

// DISPLAY ONLY. The database recalculates everything when the order is placed.
export function subtotalPkr(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.pricePkr * l.quantity, 0);
}

export function totalPkr(cart: Cart): number {
  return subtotalPkr(cart) + cart.deliveryFeePkr;
}

export function meetsMinimum(cart: Cart): boolean {
  return cart.lines.length > 0 && subtotalPkr(cart) >= cart.minOrderPkr;
}

// localStorage can be edited by the user, so never trust its shape.
export function parseCart(value: unknown): Cart {
  if (typeof value !== "object" || value === null) return EMPTY_CART;
  const v = value as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" && x.length > 0 && x.length < 200 ? x : null);
  const int = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : null);

  const restaurantId = str(v.restaurantId);
  const fee = int(v.deliveryFeePkr);
  const min = int(v.minOrderPkr);
  if (!restaurantId || fee === null || min === null || !Array.isArray(v.lines)) return EMPTY_CART;

  const lines: CartLine[] = [];
  for (const raw of v.lines) {
    if (typeof raw !== "object" || raw === null) return EMPTY_CART;
    const l = raw as Record<string, unknown>;
    const menuItemId = str(l.menuItemId);
    const name = str(l.name);
    const pricePkr = int(l.pricePkr);
    const quantity = int(l.quantity);
    if (!menuItemId || !name || pricePkr === null || quantity === null) return EMPTY_CART;
    if (quantity < 1 || quantity > MAX_QTY) return EMPTY_CART;
    lines.push({ menuItemId, name, pricePkr, quantity });
  }
  if (lines.length === 0) return EMPTY_CART;

  return {
    restaurantId,
    restaurantSlug: str(v.restaurantSlug),
    restaurantName: str(v.restaurantName),
    deliveryFeePkr: fee,
    minOrderPkr: min,
    lines,
  };
}