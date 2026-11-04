import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const { TEST_EMAIL, TEST_PASSWORD, RIDER_EMAIL, RIDER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
assert.ok(url && key && TEST_EMAIL && TEST_PASSWORD, "env vars missing");

const NIL = "00000000-0000-0000-0000-000000000000";
const LAT = 31.5111;
const LNG = 74.3436;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const owner = createClient(url, key, opts);
const login = async (client, email, password, who) => {
  const r = await client.auth.signInWithPassword({ email, password });
  assert.ok(!r.error, `${who} login failed`);
  return r.data.user.id;
};
const ownerId = await login(owner, TEST_EMAIL, TEST_PASSWORD, "test owner");

// 1. Refusals and validation.
assert.ok((await anon.rpc("set_order_location", { p_order_id: NIL, p_lat: LAT, p_lng: LNG })).error, "anon refused");
assert.ok((await anon.rpc("rider_order_location", { p_order_id: NIL })).error, "anon refused");
assert.ok((await anon.rpc("admin_order_location", { p_id: NIL })).error, "anon refused");
assert.match((await owner.rpc("admin_order_location", { p_id: NIL })).error?.message ?? "", /not_admin/);
assert.match((await owner.rpc("rider_order_location", { p_order_id: NIL })).error?.message ?? "", /not_rider/);
assert.match((await owner.rpc("set_order_location", { p_order_id: NIL, p_lat: 0, p_lng: 0 })).error?.message ?? "", /bad_location/);
assert.match((await owner.rpc("set_order_location", { p_order_id: NIL, p_lat: 51.5, p_lng: -0.12 })).error?.message ?? "", /bad_location/);
assert.match((await owner.rpc("set_order_location", { p_order_id: NIL, p_lat: LAT, p_lng: LNG })).error?.message ?? "", /order_not_found/);
assert.ok((await owner.from("orders").select("delivery_lat")).error, "the pin columns must be hidden");
assert.ok((await owner.from("orders").select("delivery_lng")).error, "the pin columns must be hidden");

// 2. Saved addresses remember their pin (happy path), and a bad pin is dropped, not stored.
const ADDRESS = `TEST PIN ADDRESS house 77 street 7 ${Date.now()}`;
assert.ifError((await owner.rpc("save_address", { p_label: "Pin", p_address: ADDRESS, p_lat: LAT, p_lng: LNG })).error);
let row = (await owner.from("saved_addresses").select("id, lat, lng").eq("address", ADDRESS)).data;
assert.equal(row.length, 1);
assert.equal(row[0].lat, LAT);
assert.equal(row[0].lng, LNG);
assert.ifError((await owner.from("saved_addresses").delete().eq("id", row[0].id)).error);
assert.ifError((await owner.rpc("save_address", { p_label: "Pin", p_address: ADDRESS, p_lat: 0, p_lng: 0 })).error);
row = (await owner.from("saved_addresses").select("id, lat, lng").eq("address", ADDRESS)).data;
assert.equal(row[0].lat, null, "an out-of-range pin must be dropped");
assert.ifError((await owner.from("saved_addresses").delete().eq("id", row[0].id)).error);
console.log("refusals and saved addresses ok");

if (!RIDER_EMAIL || !RIDER_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("location: basic checks passed (full flow skipped: add RIDER_* and ADMIN_* to .env.local)");
  process.exit(0);
}

// 3. Full flow: the pin is stored, hidden from the rider until the handover, then shown.
const rider = createClient(url, key, opts);
const admin = createClient(url, key, opts);
const riderId = await login(rider, RIDER_EMAIL, RIDER_PASSWORD, "rider");
await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");

const { data: karahi, error: kErr } = await anon
  .from("restaurants").select("id, zone_id, menu_items(id, name)").eq("slug", "karahi-house").single();
assert.ifError(kErr);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");
assert.ifError((await rider.rpc("rider_set_duty", { p_on: true })).error);

try {
  const placed = await owner.rpc("place_order", {
    p_restaurant_id: karahi.id,
    p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-location.mjs)",
    p_zone_id: karahi.zone_id,
  });
  assert.ifError(placed.error);
  const orderId = placed.data;

  // Only the customer can set it, and only inside Pakistan.
  assert.match((await rider.rpc("set_order_location", { p_order_id: orderId, p_lat: LAT, p_lng: LNG })).error?.message ?? "", /order_not_found/);
  assert.match((await owner.rpc("set_order_location", { p_order_id: orderId, p_lat: 0, p_lng: 0 })).error?.message ?? "", /bad_location/);
  assert.ifError((await owner.rpc("set_order_location", { p_order_id: orderId, p_lat: LAT, p_lng: LNG })).error);
  const seen = (await admin.rpc("admin_order_location", { p_id: orderId })).data[0];
  assert.equal(Number(seen.l_lat), LAT);
  assert.equal(Number(seen.l_lng), LNG);

  const status = (to) => owner.rpc("update_order_status", { p_order_id: orderId, p_new: to });
  assert.ifError((await status("accepted")).error);
  assert.ifError((await status("preparing")).error);
  assert.ifError((await owner.rpc("owner_mark_ready", { p_order_id: orderId })).error);
  assert.ifError((await rider.rpc("rider_claim_order", { p_order_id: orderId })).error);

  // Claimed but not handed over: the rider still must not see the pin.
  assert.equal((await rider.rpc("rider_order_location", { p_order_id: orderId })).data.length, 0, "the pin stays hidden before the handover");
  const mine = (await rider.rpc("rider_my_orders")).data.find((o) => o.o_id === orderId);
  assert.equal((await owner.rpc("owner_handover", { p_order_id: orderId, p_code: mine.o_code })).data, "ok");

  // After the handover the rider sees it, nobody else does, and the customer can no longer move it.
  const shown = (await rider.rpc("rider_order_location", { p_order_id: orderId })).data;
  assert.equal(shown.length, 1);
  assert.equal(Number(shown[0].l_lat), LAT);
  assert.match((await owner.rpc("set_order_location", { p_order_id: orderId, p_lat: LAT, p_lng: LNG })).error?.message ?? "", /invalid_transition/);

  assert.ifError((await rider.rpc("rider_mark_delivered", { p_order_id: orderId })).error);
  assert.equal((await rider.rpc("rider_order_location", { p_order_id: orderId })).data.length, 0, "the pin is hidden again after delivery");

  // Hand the cash in so later tests are not blocked by the rider's cash limit.
  const held = (await rider.rpc("rider_wallet")).data[0].w_held;
  if (held > 0) {
    assert.ifError((await admin.rpc("admin_record_deposit", { p_rider: riderId, p_amount: held, p_note: "TEST deposit" })).error);
  }
} finally {
  await rider.rpc("rider_set_duty", { p_on: false });
}

console.log("location: all checks passed");