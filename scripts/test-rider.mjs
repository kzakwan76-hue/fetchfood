import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && process.env.TEST_EMAIL && process.env.TEST_PASSWORD, "env vars missing");

const FAKE = "00000000-0000-0000-0000-000000000000";
const calls = [
  ["rider_available_orders", {}],
  ["rider_my_orders", {}],
  ["rider_claim_order", { p_order_id: FAKE }],
  ["rider_release_order", { p_order_id: FAKE }],
  ["rider_mark_delivered", { p_order_id: FAKE }],
];

// 1. Not logged in: refused.
const anon = createClient(url, key);
for (const [fn, args] of calls) {
  const { error } = await anon.rpc(fn, args);
  assert.ok(error, `anon must be refused: ${fn}`);
}

// 2. The test account is not a rider: the functions refuse it themselves.
const user = createClient(url, key);
const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");
for (const [fn, args] of calls) {
  const { error } = await user.rpc(fn, args);
  assert.ok(error, `non-rider must be refused: ${fn}`);
  assert.match(error.message, /not_rider/, `expected not_rider from ${fn}`);
}

// 3. Writing rider_id or status straight to the table is refused.
const direct = await user.from("orders").update({ rider_id: login.data.user.id }).eq("id", FAKE);
assert.ok(direct.error, "direct update of orders must be refused");

console.log("rider: all checks passed");