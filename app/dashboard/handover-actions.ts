"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: boolean };

const UUID = /^[0-9a-f-]{36}$/i;
const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  order_not_found: "Order not found.",
  invalid_transition: "This order isn't waiting for a rider handover.",
};

export async function handoverOrder(_prev: State, formData: FormData): Promise<State> {
  const orderId = String(formData.get("orderId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!UUID.test(orderId) || !/^[0-9]{4}$/.test(code)) return { error: "Enter the 4-digit code from the rider's app." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_handover", { p_order_id: orderId, p_code: code });
  if (error) return { error: MESSAGES[error.message] ?? "Could not hand over the order." };
  if (data === "wrong_code") {
    return { error: "That code doesn't match. Do NOT hand over the food. Ask them to show the code in their FetchFood rider app." };
  }
  if (data === "locked") return { error: "Too many wrong codes. Do not hand over the food. Contact FetchFood." };

  revalidatePath("/dashboard");
  return { ok: true };
}