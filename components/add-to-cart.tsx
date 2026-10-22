"use client";

import { addItem, setQuantity, type CartItem, type CartRestaurant } from "../lib/cart";
import { getCart, setCart, useCart } from "../lib/cart-store";

const btn =
  "rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-semibold text-neutral-800 hover:border-brand-500";

export function AddToCart({
  restaurant,
  item,
  disabled,
}: {
  restaurant: CartRestaurant;
  item: CartItem;
  disabled: boolean;
}) {
  const cart = useCart();
  const line =
    cart.restaurantId === restaurant.id
      ? cart.lines.find((l) => l.menuItemId === item.id)
      : undefined;

  function add() {
    const current = getCart();
    if (
      current.restaurantId &&
      current.restaurantId !== restaurant.id &&
      !window.confirm("Start a new cart? Your current cart is from another restaurant and will be cleared.")
    ) {
      return;
    }
    setCart(addItem(current, restaurant, item));
  }

  if (disabled) return <span className="text-xs font-semibold text-neutral-500">Closed</span>;

  if (!line) {
    return (
      <button type="button" onClick={add} className={btn}>
        Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Remove one ${item.name}`}
        onClick={() => setCart(setQuantity(getCart(), item.id, line.quantity - 1))}
        className={btn}
      >
        −
      </button>
      <span className="w-5 text-center font-semibold">{line.quantity}</span>
      <button
        type="button"
        aria-label={`Add one more ${item.name}`}
        onClick={() => setCart(setQuantity(getCart(), item.id, line.quantity + 1))}
        className={btn}
      >
        +
      </button>
    </div>
  );
}