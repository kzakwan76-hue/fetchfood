"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const INTENTS = ["approve", "reject", "suspend", "reinstate"];

const MESSAGES: Record<string, string> = {
  not_admin: "Only admins can do this.",
  application_not_found: "Application not found.",
  invalid_transition: "That isn't possible from the rider's current status.",
  zone_not_found: "Choose a zone.",
  bad_amount: "Deposit and limit must be whole rupees between 0 and 1,000,000.",
  bad_note: "Write a short reason (3 to 300 characters) when rejecting.",
  owner_role_conflict: "This account is an owner or admin and can't be a rider.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) if (message.includes(code)) return text;
  return "Something went wrong.";
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function reviewRider(_prev: State, formData: FormData): Promise<State> {
  const riderId = field(formData, "riderId");
  const intent = field(formData, "intent");
  if (!UUID.test(riderId) || !INTENTS.includes(intent)) return { error: "Invalid request." };
  const zoneId = field(formData, "zoneId");
  const limitRaw = field(formData, "limit");
  const depositRaw = field(formData, "deposit");
  const limit = limitRaw === "" ? null : Number(limitRaw);
  const deposit = depositRaw === "" ? 0 : Number(depositRaw);
  if ((limit !== null && !Number.isInteger(limit)) || !Number.isInteger(deposit)) return { error: MESSAGES.bad_amount };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_rider", {
    p_user: riderId,
    p_action: intent,
    p_zone: UUID.test(zoneId) ? zoneId : null,
    p_limit: limit,
    p_deposit: deposit,
    p_note: field(formData, "note") || null,
  });
  if (error) return { error: explain(error.message) };

  revalidatePath("/admin/riders");
  revalidatePath("/admin/riders/applications");
  revalidatePath(`/admin/riders/${riderId}`);
  return { ok: "Saved." };
}