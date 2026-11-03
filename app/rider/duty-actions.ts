"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string };

const MESSAGES: Record<string, string> = {
  not_rider: "Only riders can do this.",
  kyc_required: "Your rider profile isn't approved yet.",
  has_active: "Finish your current deliveries before going off duty.",
};

export async function setDuty(_prev: State, formData: FormData): Promise<State> {
  const on = String(formData.get("on") ?? "") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("rider_set_duty", { p_on: on });
  if (error) return { error: MESSAGES[error.message] ?? "Could not change your duty status." };
  revalidatePath("/rider");
  return {};
}