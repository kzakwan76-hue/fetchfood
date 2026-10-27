"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { validateEmail } from "../../lib/auth-validation";

type State = { error?: string; ok?: string };

const ROLES = ["customer", "restaurant_owner", "rider"];

const MESSAGES: Record<string, string> = {
  not_admin: "Only admins can do this.",
  role_not_allowed: "That role can't be set here.",
  user_not_found: "No account with that email. The person must sign up first.",
  cannot_change_admin: "Admin accounts can't be changed from the app.",
  owns_restaurants: "This person still owns a restaurant, so they must stay an owner.",
  owner_role_conflict: "Riders and admins can't own a restaurant.",
  slug_taken: "That web address (slug) is already used.",
  bad_slug: "Slug: 3 to 40 characters, lowercase letters, numbers and single dashes.",
  bad_name: "Name must be 1 to 80 characters.",
  bad_cuisine: "Cuisine must be 1 to 40 characters.",
  bad_area: "Area must be 1 to 60 characters.",
  bad_eta: "Delivery time must be 5 to 180 minutes.",
  bad_fee: "Delivery fee must be 0 to 2000 rupees.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) {
    if (message.includes(code)) return text;
  }
  return "Something went wrong.";
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function setRole(_prev: State, formData: FormData): Promise<State> {
  const email = text(formData, "email");
  const role = text(formData, "role");
  if (validateEmail(email)) return { error: "Enter a valid email." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_email: email, p_role: role });
  if (error) return { error: explain(error.message) };

  revalidatePath("/admin");
  return { ok: `Role updated to ${role}.` };
}

export async function createRestaurant(_prev: State, formData: FormData): Promise<State> {
  const ownerEmail = text(formData, "ownerEmail");
  const eta = Number(text(formData, "eta"));
  const fee = Number(text(formData, "fee"));
  if (validateEmail(ownerEmail)) return { error: "Enter a valid owner email." };
  if (!Number.isInteger(eta) || !Number.isInteger(fee)) {
    return { error: "Delivery time and fee must be whole numbers." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_restaurant", {
    p_slug: text(formData, "slug"),
    p_name: text(formData, "name"),
    p_cuisine: text(formData, "cuisine"),
    p_area: text(formData, "area"),
    p_eta: eta,
    p_fee: fee,
    p_owner_email: ownerEmail,
  });
  if (error) return { error: explain(error.message) };

  updateTag("catalog");
  revalidatePath("/admin");
  return { ok: "Restaurant created. It starts closed; the owner opens it from their dashboard." };
}