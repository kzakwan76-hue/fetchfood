"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateFullName } from "../../lib/auth-validation";
import { isValidPkPhone, normalizePkPhone } from "../../lib/pk";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  role_blocked: "Accounts with a restaurant, rider or admin role can't be deleted here. Please contact us.",
  active_orders: "You have an order in progress. You can delete your account after it is delivered or cancelled.",
};

export async function updateProfile(_prev: State, formData: FormData): Promise<State> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const problem =
    validateFullName(name) ??
    (isValidPkPhone(phone) ? null : "Enter a valid Pakistani mobile number, e.g. 0300 1234567.");
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: MESSAGES.not_authenticated };
  const { data: rows, error } = await supabase
    .from("profiles")
    .update({ full_name: name, phone: normalizePkPhone(phone) })
    .eq("id", data.claims.sub)
    .select("id");
  if (error || !rows?.length) return { error: "Could not save your details." };

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: "Saved." };
}

export async function deleteAccount(_prev: State, formData: FormData): Promise<State> {
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { error: "Type DELETE (in capital letters) to confirm." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: MESSAGES[error.message] ?? "Could not delete your account. Please contact us." };
  try {
    await supabase.auth.signOut();
  } catch {
    // the login no longer exists; the cookies are cleared by the redirect anyway
  }
  redirect("/");
}