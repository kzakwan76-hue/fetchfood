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
  ["admin_set_own_delivery", { p_restaurant: NIL, p_on: true }],
  ["admin_get_own_discount", {}],
  ["admin_update_own_discount", { p_bps: 400 }],
  ["admin_record_remittance", { p_restaurant: NIL, p_amount: 1, p_note: null }],
  ["admin_recent_remittances", {}],
  ["admin_own_orders", {}],
  ["admin_order_mode", { p_id: NIL }],
]) {
  assert.ok((await anon.rpc(fn, args)).error, `anon must be refused: ${fn}`);
  assert.match((await owner.rpc(fn, args)).error?.message ?? "", /not_admin/, `not_admin expected: ${fn}`);
}
for (const fn of ["owner_own_dispatch", "owner_own_delivered"]) {
  assert.ok((await anon.rpc(fn, { p_order_id: NIL })).error, `anon must be refused: ${fn}`);
  assert.match((await owner.rpc(fn, { p_order_id: NIL })).error?.message ?? "", /order_not_found/, fn);
}
assert.ok((await owner.rpc("own_commission_bps", { p_restaurant: NIL })).error, "own_commission_bps is internal");
assert.ok((await owner.from("restaurants").select("own_delivery")).error, "own_delivery must be hidden");
console.log("refusals ok");

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("own-riders: refusal checks passed (full flow skipped: add ADMIN_* to .env.local)");
  process.exit(0);
}

// 2. Full flow on Karahi House.
const admin = createClient(url, key, opts);
await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
const { data: karahi, error: kErr } = await anon
  .from("restaurants").select("id, zone_id, menu_items(id, name)").eq("slug", "karahi-house").single();
assert.ifError(kErr);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");
const restaurant = async () => (await admin.rpc("admin_restaurants", { p_id: karahi.id })).data[0];
const before = await restaurant();
const discount = (await admin.rpc("admin_get_own_discount")).data;
assert.equal(typeof discount, "number");
assert.match((await admin.rpc("admin_update_own_discount", { p_bps: 6000 })).error?.message ?? "", /bad_settings/);

try {
  assert.ifError((await admin.rpc("admin_set_own_delivery", { p_restaurant: karahi.id, p_on: true })).error);
  const placed = await owner.rpc("place_order", {
    p_restaurant_id: karahi.id,
    p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-own-riders.mjs)",
    p_zone_id: karahi.zone_id,
  });
  assert.ifError(placed.error);
  const orderId = placed.data;
  assert.equal((await admin.rpc("admin_order_mode", { p_id: orderId })).data[0].m_mode, "own");
  const status = (to) => owner.rpc("update_order_status", { p_order_id: orderId, p_new: to });

  assert.ifError((await status("accepted")).error);
  assert.ifError((await status("preparing")).error);
  // The FetchFood-rider steps and the owner's delivery steps are closed for own-rider orders.
  assert.equal((await owner.rpc("owner_mark_ready", { p_order_id: orderId })).error?.message, "invalid_transition");
  assert.equal((await status("out_for_delivery")).error?.message, "invalid_transition");
  assert.equal((await owner.rpc("owner_own_delivered", { p_order_id: orderId })).error?.message, "invalid_transition");

  assert.ifError((await owner.rpc("owner_own_dispatch", { p_order_id: orderId })).error);
  assert.equal((await owner.rpc("owner_own_dispatch", { p_order_id: orderId })).error?.message, "invalid_transition");
  assert.ifError((await owner.rpc("owner_own_delivered", { p_order_id: orderId })).error);

  // The ledger: the lowered commission, no rider pay, no FetchFood delivery cut.
  const d = (await admin.rpc("admin_order_detail", { p_id: orderId })).data[0];
  const bps = Math.max(0, before.s_bps - discount);
  const commission = Math.floor((d.d_subtotal * bps + 5000) / 10000);
  assert.equal(d.d_status, "delivered");
  assert.equal(d.d_bps, bps);
  assert.equal(d.d_commission, commission);
  assert.equal(d.d_rest_share, d.d_subtotal - commission);
  assert.equal(d.d_rider_pay, 0);
  assert.equal(d.d_platform_fee, 0);
  assert.equal(d.d_rider_id, null);

  // Balances: net movement is exactly minus the commission, and the order shows in the own-rider list.
  const after = await restaurant();
  const net = (r) => r.s_owed - r.s_owes_us;
  assert.equal(net(after) - net(before), -commission);
  assert.equal(after.s_own_orders - before.s_own_orders, 1);
  assert.ok((await admin.rpc("admin_own_orders", { p_restaurant: karahi.id })).data.some((o) => o.o_id === orderId));

  // If the restaurant now owes us, recording their payment cannot exceed it and then clears it.
  if (after.s_owes_us > 0) {
    assert.equal(
      (await admin.rpc("admin_record_remittance", { p_restaurant: karahi.id, p_amount: after.s_owes_us + 1, p_note: null })).error?.message,
      "exceeds_balance",
    );
    assert.ifError((await admin.rpc("admin_record_remittance", { p_restaurant: karahi.id, p_amount: after.s_owes_us, p_note: "TEST payment" })).error);
    assert.equal((await restaurant()).s_owes_us, 0);
  }
} finally {
  await admin.rpc("admin_set_own_delivery", { p_restaurant: karahi.id, p_on: before.s_own });
}

console.log("own-riders: all checks passed");