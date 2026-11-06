"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  order_not_found: "Order not found.",
  invalid_transition: "That step isn't possible for this order right now.",
};

export async function ownDelivery(_prev: State, formData: FormData): Promise<State> {
  const orderId = String(formData.get("orderId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!UUID.test(orderId) || (intent !== "dispatch" && intent !== "delivered")) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc(intent === "dispatch" ? "owner_own_dispatch" : "owner_own_delivered", {
    p_order_id: orderId,
  });
  if (error) return { error: MESSAGES[error.message] ?? "Could not update the order." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/earnings");
  revalidatePath(`/orders/${orderId}`);
  return {};
}