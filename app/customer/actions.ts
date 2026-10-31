"use server";

import { revalidatePath } from "next/cache";
import { MAX_QTY } from "../../lib/cart";
import { getAllRestaurantsWithMenus } from "../../lib/catalog";
import { createClient } from "../../lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  restaurant_not_found: "That restaurant isn't available.",
  too_many: "You've reached the limit. Remove one first.",
};

export async function deleteAddress(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("saved_addresses").delete().eq("id", id); // RLS: only your own rows
  revalidatePath("/addresses");
}

export async function toggleFavorite(
  restaurantId: string,
): Promise<{ error?: string; isFavorite?: boolean }> {
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_favorite", { p_restaurant_id: restaurantId });
  if (error) return { error: MESSAGES[error.message] ?? "Could not update favourites." };
  revalidatePath("/favourites");
  return { isFavorite: data === true };
}

export type ReorderResult =
  | { error: string }
  | {
      restaurant: {
        id: string;
        slug: string;
        name: string;
        deliveryFeePkr: number;
        minOrderPkr: number;
        zoneId: string | null;
      };
      lines: { id: string; name: string; pricePkr: number; quantity: number }[];
      skipped: number;
    };

// Rebuilds a past order from TODAY's menu: current prices, and dishes that no longer exist are left out.
export async function loadReorder(orderId: string): Promise<ReorderResult> {
  if (!UUID.test(orderId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return { error: "Please log in again." };

  const { data } = await supabase
    .from("orders")
    .select("customer_id, restaurant_id, order_items(menu_item_id, quantity)")
    .eq("id", orderId)
    .maybeSingle();
  const order = data as unknown as {
    customer_id: string;
    restaurant_id: string;
    order_items: { menu_item_id: string | null; quantity: number }[];
  } | null;
  if (!order || order.customer_id !== claimsData.claims.sub) return { error: "Order not found." };

  const restaurants = await getAllRestaurantsWithMenus();
  const restaurant = restaurants.find((r) => r.id === order.restaurant_id);
  if (!restaurant) return { error: "This restaurant isn't available any more." };
  if (!restaurant.isOpen) return { error: `${restaurant.name} is closed right now. Try again later.` };

  const menu = new Map(restaurant.items.map((i) => [i.id, i]));
  const lines: { id: string; name: string; pricePkr: number; quantity: number }[] = [];
  let skipped = 0;
  for (const row of order.order_items) {
    const item = row.menu_item_id ? menu.get(row.menu_item_id) : undefined;
    if (!item) {
      skipped += 1;
      continue;
    }
    lines.push({
      id: item.id,
      name: item.name,
      pricePkr: item.pricePkr,
      quantity: Math.min(Math.max(row.quantity, 1), MAX_QTY),
    });
  }
  if (lines.length === 0) return { error: "None of those dishes are on the menu any more." };

  return {
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      deliveryFeePkr: restaurant.deliveryFeePkr,
      minOrderPkr: restaurant.minOrderPkr,
      zoneId: restaurant.zoneId,
    },
    lines,
    skipped,
  };
}