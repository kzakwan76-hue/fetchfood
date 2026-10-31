"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: boolean };

const UUID = /^[0-9a-f-]{36}$/i;

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  bad_rating: "Choose 1 to 5 stars.",
  comment_too_long: "Comments can be at most 500 characters.",
  order_not_found: "We couldn't find that order.",
  not_delivered: "You can review an order after it has been delivered.",
  own_restaurant: "You can't review your own restaurant.",
  already_reviewed: "You already reviewed this order.",
};

export async function submitReview(_prev: State, formData: FormData): Promise<State> {
  const orderId = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!UUID.test(orderId)) return { error: "Invalid request." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: MESSAGES.bad_rating };
  if (comment.length > 500) return { error: MESSAGES.comment_too_long };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: comment || null,
  });
  if (error) return { error: MESSAGES[error.message] ?? "Could not send your review." };

  updateTag("catalog"); // new rating shows on restaurant pages
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}