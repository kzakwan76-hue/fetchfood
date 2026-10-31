"use server";

import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: boolean };

const KINDS = ["suggestion", "problem", "praise"];

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  bad_kind: "Choose what kind of feedback this is.",
  bad_message: "Please write between 5 and 1000 characters.",
  too_many: "You've sent a lot of feedback today. Please try again tomorrow.",
};

export async function sendFeedback(_prev: State, formData: FormData): Promise<State> {
  const kind = String(formData.get("kind") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!KINDS.includes(kind)) return { error: MESSAGES.bad_kind };
  if (message.length < 5 || message.length > 1000) return { error: MESSAGES.bad_message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", { p_kind: kind, p_message: message });
  if (error) return { error: MESSAGES[error.message] ?? "Could not send your feedback." };
  return { ok: true };
}