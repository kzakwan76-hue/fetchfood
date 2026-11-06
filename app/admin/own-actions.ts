"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

const UUID = /^[0-9a-f-]{36}$/i;

const MESSAGES: Record<string, string> = {
  not_admin: "Only admins can do this.",
  bad_settings: "The discount must be between 0 and 50 percentage points.",
  restaurant_not_found: "Restaurant not found.",
  bad_amount: "The amount must be a whole number of rupees, at least 1.",
  exceeds_balance: "That is more than the restaurant currently owes us.",
  bad_note: "The note can be at most 200 characters.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) if (message.includes(code)) return text;
  return "Something went wrong.";
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function refresh(restaurantId?: string) {
  revalidatePath("/admin/own-riders");
  revalidatePath("/admin/restaurants");
  revalidatePath("/admin/overview");
  revalidatePath("/admin/money");
  if (restaurantId) revalidatePath(`/admin/restaurants/${restaurantId}`);
  revalidatePath("/dashboard");
}

export async function setOwnDelivery(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = field(formData, "restaurantId");
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  const on = field(formData, "on") === "true";

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_own_delivery", { p_restaurant: restaurantId, p_on: on });
  if (error) return { error: explain(error.message) };
  refresh(restaurantId);
  return { ok: on ? "Own riders switched on for new orders." : "Own riders switched off for new orders." };
}

export async function updateOwnDiscount(_prev: State, formData: FormData): Promise<State> {
  const pct = Number(field(formData, "discount"));
  if (!Number.isFinite(pct)) return { error: MESSAGES.bad_settings };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_own_discount", { p_bps: Math.round(pct * 100) });
  if (error) return { error: explain(error.message) };
  refresh();
  return { ok: "Saved. It applies to own-rider orders delivered from now on." };
}

export async function recordRemittance(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = field(formData, "restaurantId");
  const amount = Number(field(formData, "amount"));
  if (!UUID.test(restaurantId) || !Number.isInteger(amount)) return { error: MESSAGES.bad_amount };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_remittance", {
    p_restaurant: restaurantId,
    p_amount: amount,
    p_note: field(formData, "note") || null,
  });
  if (error) return { error: explain(error.message) };
  refresh(restaurantId);
  return { ok: "Payment from the restaurant recorded." };
}