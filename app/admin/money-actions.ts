"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

const UUID = /^[0-9a-f-]{36}$/i;

const MESSAGES: Record<string, string> = {
  not_admin: "Only admins can do this.",
  bad_settings: "Check the numbers: commission 0 to 50%, rider share 0 to 100%, cash limit up to Rs. 1,000,000.",
  bad_commission: "Commission must be between 0 and 50%.",
  restaurant_not_found: "Restaurant not found.",
  bad_amount: "The amount must be a whole number of rupees, at least 1.",
  exceeds_balance: "That is more than the current balance.",
  not_a_rider: "That account is not a rider.",
  bad_note: "The note can be at most 200 characters.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) if (message.includes(code)) return text;
  return "Something went wrong.";
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Percent with up to two decimals -> basis points (1% = 100).
function toBps(raw: string): number | null {
  const n = Number(raw);
  return raw !== "" && Number.isFinite(n) ? Math.round(n * 100) : null;
}

export async function updateSettings(_prev: State, formData: FormData): Promise<State> {
  const commission = toBps(field(formData, "commission"));
  const rider = toBps(field(formData, "rider"));
  const limit = Number(field(formData, "limit"));
  if (commission === null || rider === null || !Number.isInteger(limit)) return { error: MESSAGES.bad_settings };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_settings", {
    p_commission_bps: commission,
    p_rider_bps: rider,
    p_limit: limit,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/money");
  return { ok: "Saved. It applies to orders delivered from now on." };
}

export async function setCommission(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = field(formData, "restaurantId");
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  const raw = field(formData, "rate");
  const bps = raw === "" ? null : toBps(raw); // empty = use the default rate
  if (raw !== "" && bps === null) return { error: MESSAGES.bad_commission };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_commission", { p_restaurant: restaurantId, p_bps: bps });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { ok: raw === "" ? "Now using the default rate." : "Saved." };
}

export async function recordPayout(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = field(formData, "restaurantId");
  const amount = Number(field(formData, "amount"));
  if (!UUID.test(restaurantId) || !Number.isInteger(amount)) return { error: MESSAGES.bad_amount };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_payout", {
    p_restaurant: restaurantId,
    p_amount: amount,
    p_note: field(formData, "note") || null,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/money");
  return { ok: "Payout recorded." };
}

export async function recordDeposit(_prev: State, formData: FormData): Promise<State> {
  const riderId = field(formData, "riderId");
  const amount = Number(field(formData, "amount"));
  if (!UUID.test(riderId) || !Number.isInteger(amount)) return { error: MESSAGES.bad_amount };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_deposit", {
    p_rider: riderId,
    p_amount: amount,
    p_note: field(formData, "note") || null,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/money");
  revalidatePath("/rider");
  return { ok: "Deposit recorded." };
}