"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const STATUSES = ["placed", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];
const MESSAGES: Record<string, string> = {
  invalid_transition: "That status change isn't allowed.",
  order_not_found: "Order not found.",
  not_authenticated: "Please log in again.",
};

// Used by the restaurant dashboard AND by customers cancelling. The database decides who may do what.
export async function changeOrderStatus(_prev: State, formData: FormData): Promise<State> {
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(orderId) || !STATUSES.includes(status)) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", { p_order_id: orderId, p_new: status });
  if (error) return { error: MESSAGES[error.message] ?? "Could not update the order." };

  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return {};
}