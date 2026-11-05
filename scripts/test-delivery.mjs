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
const login = async (client, email, password, who) => {
  const r = await client.auth.signInWithPassword({ email, password });
  assert.ok(!r.error, `${who} login failed`);
};
await login(owner, TEST_EMAIL, TEST_PASSWORD, "test owner");

// 1. Refusals.
for (const [fn, args] of [
  ["admin_get_fees", {}],
  ["admin_restaurant_locations", {}],
  ["admin_update_fees", { p_near_km: 2.5, p_near_pkr: 150, p_mid_km: 4, p_mid_pkr: 200, p_far_pkr: 250, p_max_km: 7 }],
  ["admin_set_restaurant_location", { p_restaurant: NIL, p_lat: 31.5, p_lng: 74.3 }],
]) {
  assert.ok((await anon.rpc(fn, args)).error, `anon must be refused: ${fn}`);
  assert.match((await owner.rpc(fn, args)).error?.message ?? "", /not_admin/, `not_admin expected: ${fn}`);
}
assert.ok((await owner.from("restaurants").select("lat")).error, "restaurant coordinates must be hidden");
assert.ok((await owner.rpc("km_between", { a_lat: 1, a_lng: 1, b_lat: 1, b_lng: 1 })).error, "km_between is internal");
const empty = await anon.rpc("delivery_quote", { p_restaurant: NIL, p_lat: null, p_lng: null });
assert.ifError(empty.error);
assert.equal(empty.data.length, 0);
console.log("refusals ok");

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("delivery: refusal checks passed (full flow skipped: add ADMIN_* to .env.local)");
  process.exit(0);
}

// 2. Full flow on Karahi House: set a location, price by distance, restore it afterwards.
const admin = createClient(url, key, opts);
await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
const { data: karahi, error: kErr } = await anon
  .from("restaurants").select("id, zone_id, delivery_fee_pkr, menu_items(id, name)").eq("slug", "karahi-house").single();
assert.ifError(kErr);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");
const fees = (await admin.rpc("admin_get_fees")).data[0];
const before = (await admin.rpc("admin_restaurant_locations")).data.find((r) => r.l_id === karahi.id);

assert.match((await admin.rpc("admin_update_fees", { p_near_km: 5, p_near_pkr: 150, p_mid_km: 4, p_mid_pkr: 200, p_far_pkr: 250, p_max_km: 7 })).error?.message ?? "", /bad_fees/);
assert.match((await admin.rpc("admin_update_fees", { p_near_km: 2.5, p_near_pkr: 300, p_mid_km: 4, p_mid_pkr: 200, p_far_pkr: 250, p_max_km: 7 })).error?.message ?? "", /bad_fees/);
assert.match((await admin.rpc("admin_set_restaurant_location", { p_restaurant: karahi.id, p_lat: 0, p_lng: 0 })).error?.message ?? "", /bad_location/);

const BASE = { lat: 31.5, lng: 74.35 };
const pinAt = (km) => ({ lat: BASE.lat + km / 111.19, lng: BASE.lng });
const near = pinAt(Number(fees.f_near_km) * 0.8);
const mid = pinAt((Number(fees.f_near_km) + Number(fees.f_mid_km)) / 2);
const far = pinAt((Number(fees.f_mid_km) + Number(fees.f_max_km)) / 2);
const tooFar = pinAt(Number(fees.f_max_km) + 3);
const quote = async (p) =>
  (await anon.rpc("delivery_quote", { p_restaurant: karahi.id, p_lat: p?.lat ?? null, p_lng: p?.lng ?? null })).data[0];
const place = (p) =>
  owner.rpc("place_order", {
    p_restaurant_id: karahi.id,
    p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-delivery.mjs)",
    p_zone_id: karahi.zone_id,
    p_lat: p?.lat ?? null,
    p_lng: p?.lng ?? null,
  });

try {
  // Without a location the restaurant keeps its flat fee.
  assert.ifError((await admin.rpc("admin_set_restaurant_location", { p_restaurant: karahi.id, p_lat: null, p_lng: null })).error);
  let q = await quote(near);
  assert.equal(q.q_status, "flat");
  assert.equal(q.q_fee, karahi.delivery_fee_pkr);

  assert.ifError((await admin.rpc("admin_set_restaurant_location", { p_restaurant: karahi.id, p_lat: BASE.lat, p_lng: BASE.lng })).error);
  assert.equal((await quote(null)).q_status, "no_pin");
  q = await quote(near);
  assert.equal(q.q_status, "ok");
  assert.equal(q.q_fee, fees.f_near_pkr);
  assert.equal((await quote(mid)).q_fee, fees.f_mid_pkr);
  assert.equal((await quote(far)).q_fee, fees.f_far_pkr);
  assert.equal((await quote(tooFar)).q_status, "too_far");

  // The database enforces it when the order is placed.
  assert.equal((await place(null)).error?.message, "pin_required");
  assert.equal((await place(tooFar)).error?.message, "too_far");
  const ok = await place(mid);
  assert.ifError(ok.error);
  const saved = (await owner.from("orders").select("subtotal_pkr, delivery_fee_pkr, total_pkr").eq("id", ok.data).single()).data;
  assert.equal(saved.delivery_fee_pkr, fees.f_mid_pkr);
  assert.equal(saved.total_pkr, saved.subtotal_pkr + fees.f_mid_pkr);
  const pinSeen = (await admin.rpc("admin_order_location", { p_id: ok.data })).data[0];
  assert.ok(pinSeen.l_lat !== null, "the pin is stored with the order");
  assert.ifError((await owner.rpc("update_order_status", { p_order_id: ok.data, p_new: "cancelled" })).error);
} finally {
  // Put Karahi House back exactly as it was, so the other tests are not affected.
  await admin.rpc("admin_set_restaurant_location", {
    p_restaurant: karahi.id,
    p_lat: before?.l_lat ?? null,
    p_lng: before?.l_lng ?? null,
  });
}

console.log("delivery: all checks passed");