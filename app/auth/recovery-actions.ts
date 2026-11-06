"use server";

import { redirect } from "next/navigation";
import { validateEmail, validatePassword } from "../../lib/auth-validation";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

export async function requestReset(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  const problem = validateEmail(email);
  if (problem) return { error: problem };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email);
  // The same answer whether or not the account exists, so nobody can probe for emails.
  return { ok: "If an account exists for that email, we have sent a link to reset the password. Check your inbox and spam folder." };
}

export async function setNewPassword(_prev: State, formData: FormData): Promise<State> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const problem = validatePassword(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "This reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/account");
}