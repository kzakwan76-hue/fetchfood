import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the routes that use Supabase login.
export const config = {
  matcher: ["/login", "/signup", "/account"],
};
