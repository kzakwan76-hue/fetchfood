import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// Only sign-up confirmation and password recovery links are accepted here.
const TYPES: EmailOtpType[] = ["email", "signup", "recovery"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  // The destination is fixed on purpose: never redirect to an address taken from the link.
  const destination = request.nextUrl.clone();
  destination.search = "";

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      destination.pathname = type === "recovery" ? "/reset-password" : "/account";
      return NextResponse.redirect(destination);
    }
  }
  destination.pathname = "/auth/confirm-failed";
  return NextResponse.redirect(destination);
}