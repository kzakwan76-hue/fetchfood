"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { isValidPkPhone, normalizePkPhone } from "../../lib/pk";
import {
  validateEmail,
  validateFullName,
  validatePassword,
} from "../../lib/auth-validation";

type FormState = { error?: string };

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = text(formData, "full_name");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? ""); // never trim passwords

  const problem =
    validateFullName(fullName) ??
    (isValidPkPhone(phone) ? null : "Enter a valid Pakistani mobile number, e.g. 0300 1234567.") ??
    validateEmail(email) ??
    validatePassword(password);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Only name and phone travel here. The role is NEVER taken from the form.
    options: { data: { full_name: fullName, phone: normalizePkPhone(phone) } },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { error: "Account created. Confirm your email, then log in." };
  }
  redirect("/account");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password." };
  redirect("/account");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}