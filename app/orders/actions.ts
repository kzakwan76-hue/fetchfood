"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
// "ready" is not a status: it means "food is ready, riders may take it".
const STATUSES = ["placed", "accepted", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
const MESSAGES: Record<string, string> = {
  invalid_transition: "That change isn't allowed. Delivery is done by the rider.",
  order_not_found: "Order not found.",
  not_authenticated: "Please log in again.",
};

// Used by the restaurant dashboard AND by customers cancelling. The database decides who may do what.
export async function changeOrderStatus(_prev: State, formData: FormData): Promise<State> {
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(orderId) || !STATUSES.includes(status)) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } =
    status === "ready"
      ? await supabase.rpc("owner_mark_ready", { p_order_id: orderId })
      : await supabase.rpc("update_order_status", { p_order_id: orderId, p_new: status });
  if (error) return { error: MESSAGES[error.message] ?? "Could not update the order." };

  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return {};
}