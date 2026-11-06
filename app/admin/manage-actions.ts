"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

const UUID = /^[0-9a-f-]{36}$/i;

const MESSAGES: Record<string, string> = {
  not_admin: "Only admins can do this.",
  bad_input: "Invalid request.",
  bad_name: "Name must be 1 to 80 characters.",
  bad_cuisine: "Cuisine must be 1 to 40 characters.",
  bad_area: "Area must be 1 to 60 characters.",
  bad_eta: "Delivery time must be 5 to 180 minutes.",
  bad_fee: "Delivery fee must be 0 to 2000 rupees.",
  bad_zone: "Zone name must be 1 to 60 characters.",
  restaurant_not_found: "Restaurant not found.",
  zone_not_found: "Zone not found.",
  zone_taken: "Another zone already has that name.",
  zone_in_use: "Active restaurants still use this zone. Move or hide them first.",
  has_open_orders: "This restaurant has orders in progress. Finish or cancel them first.",
  user_not_found: "No account with that email. The person must sign up first.",
  owner_role_conflict: "Riders and admins can't own a restaurant.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) if (message.includes(code)) return text;
  return "Something went wrong.";
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function refresh(id?: string) {
  updateTag("catalog");
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  if (id) revalidatePath(`/admin/restaurants/${id}`);
}

export async function updateRestaurantDetails(_prev: State, formData: FormData): Promise<State> {
  const id = field(formData, "id");
  const eta = Number(field(formData, "eta"));
  const fee = Number(field(formData, "fee"));
  if (!UUID.test(id) || !Number.isInteger(eta) || !Number.isInteger(fee)) return { error: MESSAGES.bad_input };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_restaurant", {
    p_id: id,
    p_name: field(formData, "name"),
    p_cuisine: field(formData, "cuisine"),
    p_area: field(formData, "area"),
    p_eta: eta,
    p_fee: fee,
  });
  if (error) return { error: explain(error.message) };
  refresh(id);
  return { ok: "Saved." };
}

export async function setRestaurantActive(_prev: State, formData: FormData): Promise<State> {
  const id = field(formData, "id");
  if (!UUID.test(id)) return { error: MESSAGES.bad_input };
  const active = field(formData, "active") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_restaurant_active", { p_restaurant: id, p_active: active });
  if (error) return { error: explain(error.message) };
  refresh(id);
  return { ok: active ? "The restaurant is visible again (it stays closed until its owner opens it)." : "The restaurant is hidden from customers." };
}

export async function setRestaurantOwner(_prev: State, formData: FormData): Promise<State> {
  const id = field(formData, "id");
  if (!UUID.test(id)) return { error: MESSAGES.bad_input };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_restaurant_owner", { p_restaurant: id, p_email: field(formData, "email") });
  if (error) return { error: explain(error.message) };
  refresh(id);
  return { ok: "Owner changed." };
}

export async function updateZone(_prev: State, formData: FormData): Promise<State> {
  const id = field(formData, "id");
  if (!UUID.test(id)) return { error: MESSAGES.bad_input };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_zone", {
    p_zone: id,
    p_name: field(formData, "name"),
    p_active: field(formData, "active") === "on",
  });
  if (error) return { error: explain(error.message) };
  refresh();
  return { ok: "Saved." };
}