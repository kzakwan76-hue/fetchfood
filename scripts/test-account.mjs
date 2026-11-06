import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const { TEST_EMAIL, TEST_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
assert.ok(url && key && TEST_EMAIL && TEST_PASSWORD, "env vars missing");

const NIL = "00000000-0000-0000-0000-000000000000";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const owner = createClient(url, key, opts);
assert.ok(!(await owner.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })).error, "login failed");

// 1. Refusals.
assert.ok((await anon.rpc("delete_my_account")).error, "anon must be refused");
assert.match((await owner.rpc("delete_my_account")).error?.message ?? "", /role_blocked/, "an owner cannot delete the account here");
for (const [fn, args] of [
  ["admin_set_restaurant_active", { p_restaurant: NIL, p_active: true }],
  ["admin_update_restaurant", { p_id: NIL, p_name: "x", p_cuisine: "x", p_area: "x", p_eta: 30, p_fee: 100 }],
  ["admin_set_restaurant_owner", { p_restaurant: NIL, p_email: "nobody@example.com" }],
  ["admin_update_zone", { p_zone: NIL, p_name: "x", p_active: true }],
]) {
  assert.ok((await anon.rpc(fn, args)).error, `anon must be refused: ${fn}`);
  assert.match((await owner.rpc(fn, args)).error?.message ?? "", /not_admin/, `not_admin expected: ${fn}`);
}
console.log("refusals ok");

// 2. Account deletion, happy path (skipped if sign-up needs email confirmation).
const temp = createClient(url, key, opts);
const email = `fetchfood.test.${Date.now()}@example.com`;
const signUp = await temp.auth.signUp({ email, password: "TestPassword123", options: { data: { full_name: "Test Delete", phone: "03001234567" } } });
if (signUp.error || !signUp.data.session) {
  console.log("account deletion skipped (sign-up needs email confirmation or was refused)");
} else {
  assert.ifError((await temp.rpc("save_address", { p_label: "T", p_address: "TEST ADDRESS house 1 street 1 Lahore" })).error);
  assert.ifError((await temp.rpc("delete_my_account")).error);
  const again = await createClient(url, key, opts).auth.signInWithPassword({ email, password: "TestPassword123" });
  assert.ok(again.error, "a deleted account must not be able to log in");
  console.log("account deletion ok");
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("account: refusal checks passed (admin part skipped: add ADMIN_* to .env.local)");
  process.exit(0);
}

// 3. Admin tools, restoring everything afterwards.
const admin = createClient(url, key, opts);
assert.ok(!(await admin.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).error, "admin login failed");

const { data: dhaba } = await admin.from("restaurants").select("id, name, cuisine, area, eta_minutes, delivery_fee_pkr, is_active").eq("slug", "desi-dhaba").single();
assert.ok(dhaba);
const patch = (o = {}) => admin.rpc("admin_update_restaurant", {
  p_id: dhaba.id, p_name: dhaba.name, p_cuisine: dhaba.cuisine, p_area: dhaba.area,
  p_eta: dhaba.eta_minutes, p_fee: dhaba.delivery_fee_pkr, ...o,
});
try {
  assert.match((await patch({ p_eta: 1 })).error?.message ?? "", /bad_eta/);
  assert.ifError((await patch({ p_name: `${dhaba.name} TEST` })).error);
  assert.equal((await admin.from("restaurants").select("name").eq("id", dhaba.id).single()).data.name, `${dhaba.name} TEST`);
  assert.ifError((await admin.rpc("admin_set_restaurant_active", { p_restaurant: dhaba.id, p_active: false })).error);
  assert.equal((await anon.from("restaurants").select("id").eq("id", dhaba.id)).data.length, 0, "a hidden restaurant is invisible to the public");
  assert.ifError((await admin.rpc("admin_set_restaurant_active", { p_restaurant: dhaba.id, p_active: true })).error);
  assert.equal((await anon.from("restaurants").select("id").eq("id", dhaba.id)).data.length, 1);
  assert.match((await admin.rpc("admin_set_restaurant_owner", { p_restaurant: dhaba.id, p_email: "nobody.at.all@example.com" })).error?.message ?? "", /user_not_found/);
} finally {
  await patch();
  await admin.rpc("admin_set_restaurant_active", { p_restaurant: dhaba.id, p_active: dhaba.is_active });
}

const { data: zones } = await admin.from("zones").select("id, name, is_active");
const gulberg = zones.find((z) => z.name === "Gulberg");
assert.ok(gulberg);
assert.match((await admin.rpc("admin_update_zone", { p_zone: gulberg.id, p_name: "Gulberg", p_active: false })).error?.message ?? "", /zone_in_use/);
try {
  assert.ifError((await admin.rpc("admin_update_zone", { p_zone: gulberg.id, p_name: "Gulberg TEST", p_active: true })).error);
  assert.equal((await admin.from("zones").select("name").eq("id", gulberg.id).single()).data.name, "Gulberg TEST");
} finally {
  await admin.rpc("admin_update_zone", { p_zone: gulberg.id, p_name: gulberg.name, p_active: gulberg.is_active });
}

console.log("account: all checks passed");