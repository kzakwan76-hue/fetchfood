"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: boolean };

const UUID = /^[0-9a-f-]{36}$/i;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function validPrice(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : null; // whole rupees only
}

function refreshPublicMenu() {
  updateTag("catalog"); // customers see the change on their next visit
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/menu");
}

export async function setRestaurantOpen(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = text(formData, "restaurantId");
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  const open = text(formData, "open") === "true";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update({ is_open: open })
    .eq("id", restaurantId)
    .select("id");
  if (error || !data?.length) return { error: "Could not update. Are you the owner of this restaurant?" };

  refreshPublicMenu();
  return { ok: true };
}

export async function updateMenuItem(_prev: State, formData: FormData): Promise<State> {
  const itemId = text(formData, "itemId");
  if (!UUID.test(itemId)) return { error: "Invalid request." };

  const intent = text(formData, "intent");
  let patch: { is_available?: boolean; price_pkr?: number };
  if (intent === "toggle") {
    patch = { is_available: text(formData, "available") === "true" };
  } else if (intent === "price") {
    const price = validPrice(text(formData, "price"));
    if (price === null) return { error: "Price must be a whole number of rupees from 1 to 100000." };
    patch = { price_pkr: price };
  } else {
    return { error: "Invalid request." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("menu_items").update(patch).eq("id", itemId).select("id");
  if (error || !data?.length) return { error: "Could not update this item." };

  refreshPublicMenu();
  return { ok: true };
}

export async function addMenuItem(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = text(formData, "restaurantId");
  const name = text(formData, "name");
  const category = text(formData, "category");
  const description = text(formData, "description");
  const price = validPrice(text(formData, "price"));

  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  if (name.length < 1 || name.length > 80) return { error: "Name must be 1 to 80 characters." };
  if (category.length < 1 || category.length > 40) return { error: "Category must be 1 to 40 characters." };
  if (description.length > 200) return { error: "Description can be at most 200 characters." };
  if (price === null) return { error: "Price must be a whole number of rupees from 1 to 100000." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    restaurant_id: restaurantId,
    name,
    description: description || null,
    price_pkr: price,
    category,
  });
  if (error) return { error: "Could not add the item. Are you the owner of this restaurant?" };

  refreshPublicMenu();
  return { ok: true };
}