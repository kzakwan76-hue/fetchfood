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
  deposit_first: "This rider still holds cash. Record their deposit first, then pay them.",
  order_not_found: "Order not found.",
  invalid_transition: "That order can't be cancelled any more.",
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
  const limit = Number(field(formData, "limit"));
  if (commission === null || !Number.isInteger(limit)) return { error: MESSAGES.bad_settings };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_settings", {
    p_commission_bps: commission,
    p_rider_bps: 10000, // riders keep the whole delivery fee
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


export async function updateRules(_prev: State, formData: FormData): Promise<State> {
  const requireDuty = field(formData, "requireDuty") === "on";
  const bonus = Number(field(formData, "bonus"));
  const cancel = Number(field(formData, "cancel"));
  if (!Number.isInteger(bonus) || !Number.isInteger(cancel)) return { error: "Bonus and minutes must be whole numbers." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_rules", {
    p_require_duty: requireDuty,
    p_bonus: bonus,
    p_cancel: cancel,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/money");
  revalidatePath("/admin/overview");
  return { ok: "Saved." };
}

export async function recordRiderPayout(_prev: State, formData: FormData): Promise<State> {
  const riderId = field(formData, "riderId");
  const amount = Number(field(formData, "amount"));
  if (!UUID.test(riderId) || !Number.isInteger(amount)) return { error: MESSAGES.bad_amount };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_rider_payout", {
    p_rider: riderId,
    p_amount: amount,
    p_note: field(formData, "note") || null,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/money");
  revalidatePath("/rider");
  return { ok: "Rider payout recorded." };
}

export async function addCredit(_prev: State, formData: FormData): Promise<State> {
  const riderId = field(formData, "riderId");
  const amount = Number(field(formData, "amount"));
  const note = field(formData, "note");
  if (!UUID.test(riderId) || !Number.isInteger(amount)) return { error: MESSAGES.bad_amount };
  if (note.length < 3) return { error: "Write why (3 to 200 characters), for example 'first-month guarantee'." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_credit", { p_rider: riderId, p_amount: amount, p_note: note });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/money");
  revalidatePath("/rider");
  return { ok: "Incentive added to what you owe this rider." };
}

export async function cancelOrderAdmin(_prev: State, formData: FormData): Promise<State> {
  const orderId = field(formData, "orderId");
  if (!UUID.test(orderId)) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_order", {
    p_order_id: orderId,
    p_reason: field(formData, "reason") || null,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/overview");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: "Order cancelled. The customer and restaurant were told." };
}