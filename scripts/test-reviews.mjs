import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && process.env.TEST_EMAIL && process.env.TEST_PASSWORD, "env vars missing");

const NIL = "00000000-0000-0000-0000-000000000000";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const user = createClient(url, key, opts);

// 1. Logged-out visitors are refused by every write or private function.
for (const [fn, args] of [
  ["submit_review", { p_order_id: NIL, p_rating: 5, p_comment: "x" }],
  ["submit_feedback", { p_kind: "praise", p_message: "hello there" }],
  ["my_delivered_order_count", {}],
  ["my_order_review", { p_order_id: NIL }],
  ["admin_list_feedback", {}],
]) {
  const { error } = await anon.rpc(fn, args);
  assert.ok(error, `anon must be refused: ${fn}`);
}

// 2. Ratings are public, but who wrote a review and which order it belongs to are not.
const stats = await anon.rpc("restaurant_rating_stats");
assert.ifError(stats.error);
const hidden = await anon.from("reviews").select("customer_id");
assert.ok(hidden.error, "customer_id must not be readable");
const hidden2 = await anon.from("reviews").select("order_id");
assert.ok(hidden2.error, "order_id must not be readable");
const feedbackRead = await anon.from("feedback").select("id");
assert.ok(feedbackRead.error || (feedbackRead.data ?? []).length === 0, "feedback must not be readable");

// 3. A logged-in non-admin is refused by the database itself.
const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");

let r = await user.rpc("submit_review", { p_order_id: NIL, p_rating: 9, p_comment: null });
assert.match(r.error?.message ?? "", /bad_rating/);
r = await user.rpc("submit_review", { p_order_id: NIL, p_rating: 5, p_comment: null });
assert.match(r.error?.message ?? "", /order_not_found/);
r = await user.rpc("submit_feedback", { p_kind: "nonsense", p_message: "hello there" });
assert.match(r.error?.message ?? "", /bad_kind/);
r = await user.rpc("admin_list_feedback");
assert.match(r.error?.message ?? "", /not_admin/);
r = await user.rpc("my_delivered_order_count");
assert.ifError(r.error);
assert.equal(typeof r.data, "number");

// 4. Writing straight to the tables is refused.
const direct = await user.from("reviews").insert({
  order_id: NIL,
  restaurant_id: NIL,
  customer_id: login.data.user.id,
  rating: 5,
});
assert.ok(direct.error, "direct review insert must be refused");
const directFeedback = await user
  .from("feedback")
  .insert({ user_id: login.data.user.id, kind: "praise", message: "hello there" });
assert.ok(directFeedback.error, "direct feedback insert must be refused");

console.log("reviews: all checks passed");