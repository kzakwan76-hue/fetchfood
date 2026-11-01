import { notFound, redirect } from "next/navigation";
import { createClient } from "./supabase/server";

// Call "await connection()" first. UI hint only: every admin function checks the role again.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", data.claims.sub).single();
  if (me?.role !== "admin") notFound();
  return supabase;
}