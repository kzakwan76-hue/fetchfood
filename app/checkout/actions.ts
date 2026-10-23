"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { isValidPkPhone, normalizePkPhone } from "../../lib/pk";
import { MAX_QTY } from "../../lib/cart";

type State = { error?: string; values?: { address: string; phone: string; note: string } };

const MESSAGES: Record<string, string> = {
  below_minimum: "Your cart is below this restaurant's minimum order.",
  restaurant_unavailable: "This restaurant is closed or unavailable right now.",
  invalid_items: "An item in your cart is no longer available. Please review your cart.",
  bad_items: "Your cart is empty.",
  address_too_short: "Please enter your full delivery address.",
  phone_invalid: "Enter a valid Pakistani mobile number.",
};

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function placeOrder(_prev: State, formData: FormData): Promise<State> {
  const values = { address: text(formData, "address"), phone: text(formData, "phone"), note: text(formData, "note") };
  const fail = (error: string): State => ({ error, values });

  // Only item IDs and quantities are read from the browser. Prices are never sent or trusted.
  let restaurantId = "";
  let items: { menu_item_id: string; quantity: number }[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("cart") ?? ""));
    restaurantId = typeof parsed.restaurantId === "string" ? parsed.restaurantId : "";
    if (!Array.isArray(parsed.items)) throw new Error("bad cart");
    items = parsed.items.map((i: { menuItemId?: unknown; quantity?: unknown }) => {
      if (
        typeof i.menuItemId !== "string" ||
        typeof i.quantity !== "number" ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > MAX_QTY
      ) {
        throw new Error("bad item");
      }
      return { menu_item_id: i.menuItemId, quantity: i.quantity };
    });
  } catch {
    return fail("Your cart could not be read. Please go back to your cart and try again.");
  }
  if (!restaurantId || items.length === 0) return fail("Your cart is empty.");
  if (values.address.length < 10) return fail(MESSAGES.address_too_short);
  if (!isValidPkPhone(values.phone)) return fail(MESSAGES.phone_invalid);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_restaurant_id: restaurantId,
    p_items: items,
    p_address: values.address,
    p_phone: normalizePkPhone(values.phone),
    p_note: values.note || null,
  });

  if (error) {
    if (error.message === "not_authenticated") redirect("/login");
    return fail(MESSAGES[error.message] ?? "Could not place your order. Please try again.");
  }
  redirect(`/orders/${data}?placed=1`);
}