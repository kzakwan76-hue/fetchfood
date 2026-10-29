import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && process.env.TEST_EMAIL && process.env.TEST_PASSWORD, "env vars missing");

const restaurantArgs = {
  p_slug: "tamper-test",
  p_name: "Tamper Test",
  p_cuisine: "None",
  p_area: "None",
  p_eta: 30,
  p_fee: 100,
  p_owner_email: "nobody@example.com",
};

// 1. A visitor who is not logged in cannot call any admin function.
const anon = createClient(url, key);
for (const [fn, args] of [
  ["admin_list_users", {}],
  ["admin_set_role", { p_email: "nobody@example.com", p_role: "rider" }],
  ["admin_create_restaurant", restaurantArgs],
]) {
  const { error } = await anon.rpc(fn, args);
  assert.ok(error, `anon must be refused: ${fn}`);
}

// 2. The test account is a logged-in NON-admin: the functions refuse it themselves.
const user = createClient(url, key);
const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");

for (const [fn, args] of [
  ["admin_list_users", {}],
  ["admin_set_role", { p_email: process.env.TEST_EMAIL, p_role: "customer" }],
  ["admin_create_restaurant", restaurantArgs],
]) {
  const { error } = await user.rpc(fn, args);
  assert.ok(error, `non-admin must be refused: ${fn} (is the TEST account an admin by mistake?)`);
  assert.match(error.message, /not_admin/, `expected not_admin from ${fn}`);
}

// 3. Writing straight to the table is refused too.
const direct = await user.from("restaurants").insert({
  slug: "tamper-test",
  name: "Tamper Test",
  cuisine: "None",
  area: "None",
  eta_minutes: 30,
  delivery_fee_pkr: 100,
  min_order_pkr: 0,
});
assert.ok(direct.error, "direct insert must be refused");

// 4. Nothing was created.
const { data } = await anon.from("restaurants").select("slug").eq("slug", "tamper-test");
assert.equal(data?.length ?? 0, 0);

// 5. The release functions refuse non-admins too.
for (const [fn, args] of [
  ["admin_active_deliveries", {}],
  ["admin_release_order", { p_order_id: "00000000-0000-0000-0000-000000000000" }],
]) {
  const a = await anon.rpc(fn, args);
  assert.ok(a.error, `anon must be refused: ${fn}`);
  const u = await user.rpc(fn, args);
  assert.match(u.error?.message ?? "", /not_admin/, `expected not_admin from ${fn}`);
}

// 6. Zone functions and direct zone writes are refused for non-admins.
const NIL = "00000000-0000-0000-0000-000000000000";
for (const [fn, args] of [
  ["admin_create_zone", { p_name: "Tamper Zone" }],
  ["admin_set_restaurant_zone", { p_restaurant_id: NIL, p_zone_id: NIL }],
  ["admin_set_rider_zone", { p_email: "nobody@example.com", p_zone_id: NIL }],
]) {
  const a = await anon.rpc(fn, args);
  assert.ok(a.error, `anon must be refused: ${fn}`);
  const u = await user.rpc(fn, args);
  assert.match(u.error?.message ?? "", /not_admin/, `expected not_admin from ${fn}`);
}
const zoneWrite = await user.from("zones").insert({ slug: "tamper", name: "Tamper" });
assert.ok(zoneWrite.error, "direct zone insert must be refused");

console.log("admin: all checks passed");