const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing env vars. Run with: node --no-warnings --env-file=.env.local scripts\\test-supabase.mjs");
  process.exit(1);
}

// An anonymous visitor must NEVER be able to read profiles.
const res = await fetch(`${url}/rest/v1/profiles?select=id,role`, {
  headers: { apikey: key },
});
const body = await res.json().catch(() => null);
console.log("status:", res.status);

if (res.ok) {
  if (!Array.isArray(body) || body.length !== 0) {
    console.error("FAIL: anonymous request returned rows");
    process.exit(1);
  }
  console.log("profiles: anonymous read returned 0 rows");
} else {
  console.log("profiles: anonymous read refused (", body?.message ?? "no message", ")");
}
console.log("supabase check passed");