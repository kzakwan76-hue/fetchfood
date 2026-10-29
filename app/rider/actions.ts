"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;

const FUNCTIONS: Record<string, string> = {
  claim: "rider_claim_order",
  release: "rider_release_order",
  deliver: "rider_mark_delivered",
};

const MESSAGES: Record<string, string> = {
  not_rider: "Only riders can do this.",
  order_not_found: "Order not found.",
  not_available: "Someone else already took this order.",
  wrong_zone: "This order is outside your zone.",                      
  too_many: "You already have 3 active deliveries. Finish one first.",
  invalid_transition: "That change isn't allowed right now.",
  not_authenticated: "Please log in again.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) {
    if (message.includes(code)) return text;
  }
  return "Something went wrong.";
}

// One action for claim / release / deliver. The database checks the rider role every time.
export async function riderAction(_prev: State, formData: FormData): Promise<State> {
  const orderId = String(formData.get("orderId") ?? "");
  const fn = FUNCTIONS[String(formData.get("intent") ?? "")];
  if (!UUID.test(orderId) || !fn) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_order_id: orderId });
  if (error) return { error: explain(error.message) };

  revalidatePath("/rider");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return {};
}