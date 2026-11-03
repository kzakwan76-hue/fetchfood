import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const { TEST_EMAIL, TEST_PASSWORD, RIDER_EMAIL, RIDER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
assert.ok(url && key && TEST_EMAIL && TEST_PASSWORD, "env vars missing");

const NIL = "00000000-0000-0000-0000-000000000000";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const owner = createClient(url, key, opts);
const login = async (client, email, password, who) => {
  const r = await client.auth.signInWithPassword({ email, password });
  assert.ok(!r.error, `${who} login failed`);
  return r.data.user.id;
};
await login(owner, TEST_EMAIL, TEST_PASSWORD, "test owner");

// 1. Every admin function refuses anonymous visitors and logged-in non-admins.
const adminCalls = [
  ["admin_overview", {}],
  ["admin_orders", {}],
  ["admin_order_detail", { p_id: NIL }],
  ["admin_riders", {}],
  ["admin_restaurants", {}],
  ["admin_get_settings", {}],
  ["admin_recent_settlements", {}],
  ["admin_update_settings", { p_commission_bps: 1000, p_rider_bps: 8000, p_limit: 5000 }],
  ["admin_set_commission", { p_restaurant: NIL, p_bps: null }],
  ["admin_record_payout", { p_restaurant: NIL, p_amount: 1, p_note: null }],
  ["admin_record_deposit", { p_rider: NIL, p_amount: 1, p_note: null }],
];
for (const [fn, args] of adminCalls) {
  const a = await anon.rpc(fn, args);
  assert.ok(a.error, `anon must be refused: ${fn}`);
  const u = await owner.rpc(fn, args);
  assert.match(u.error?.message ?? "", /not_admin/, `non-admin must get not_admin: ${fn}`);
}

// 2. Money columns and tables are hidden.
assert.ok((await owner.from("orders").select("commission_pkr")).error, "commission_pkr must be hidden");
assert.ok((await owner.from("orders").select("rider_pay_pkr")).error, "rider_pay_pkr must be hidden");
assert.ok((await anon.from("restaurants").select("commission_bps")).error, "commission_bps must be hidden");
assert.ok((await owner.from("restaurants").select("commission_bps")).error, "commission_bps must be hidden from owners too");
assert.ok((await owner.from("platform_settings").select("*")).error, "settings must be hidden");
assert.ok((await owner.from("rider_deposits").select("*")).error, "deposits must be hidden");
assert.match((await owner.rpc("rider_wallet")).error?.message ?? "", /not_rider/);
assert.match((await owner.rpc("owner_mark_ready", { p_order_id: NIL })).error?.message ?? "", /order_not_found/);
const earnings = await owner.rpc("owner_earnings");
assert.ifError(earnings.error);
assert.ok(earnings.data.length >= 1, "the test owner owns Karahi House");
console.log("refusals ok");

if (!RIDER_EMAIL || !RIDER_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("ledger: refusal checks passed (full flow skipped: add RIDER_* and ADMIN_* to .env.local)");
  process.exit(0);
}

// 3. The full flow: owner prepares, rider delivers, the ledger adds up.
const rider = createClient(url, key, opts);
const admin = createClient(url, key, opts);
const riderId = await login(rider, RIDER_EMAIL, RIDER_PASSWORD, "rider");
await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
assert.ifError((await rider.rpc("rider_set_duty", { p_on: true })).error);

const { data: karahi, error: kErr } = await anon
  .from("restaurants")
  .select("id, zone_id, menu_items(id, name)")
  .eq("slug", "karahi-house")
  .single();
assert.ifError(kErr);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");

// Start with an empty rider wallet so the cash limit cannot interfere.
let wallet = (await rider.rpc("rider_wallet")).data[0];
if (wallet.w_held > 0) {
  const r = await admin.rpc("admin_record_deposit", { p_rider: riderId, p_amount: wallet.w_held, p_note: "TEST reset" });
  assert.ifError(r.error);
}
const settings = (await admin.rpc("admin_get_settings")).data[0];
const before = (await admin.rpc("admin_restaurants", { p_id: karahi.id })).data[0];

const placed = await owner.rpc("place_order", {
  p_restaurant_id: karahi.id,
  p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
  p_address: "House 1, Street 2, Sample Area A, Test City",
  p_phone: "03001234567",
  p_note: "TEST ORDER (scripts/test-ledger.mjs)",
  p_zone_id: karahi.zone_id,
});
assert.ifError(placed.error);
const orderId = placed.data;
const status = (to) => owner.rpc("update_order_status", { p_order_id: orderId, p_new: to });

assert.ifError((await status("accepted")).error);
assert.ifError((await status("preparing")).error);
// Owners can never do the delivery steps.
assert.equal((await status("out_for_delivery")).error?.message, "invalid_transition");
assert.equal((await status("delivered")).error?.message, "invalid_transition");

// Not ready yet: riders cannot see or take it.
let avail = await rider.rpc("rider_available_orders");
assert.ifError(avail.error);
assert.ok(!avail.data.some((o) => o.o_id === orderId), "a not-ready order must not be offered");
assert.equal((await rider.rpc("rider_claim_order", { p_order_id: orderId })).error?.message, "not_available");

assert.ifError((await owner.rpc("owner_mark_ready", { p_order_id: orderId })).error);
assert.equal((await owner.rpc("owner_mark_ready", { p_order_id: orderId })).error?.message, "invalid_transition");

avail = await rider.rpc("rider_available_orders");
assert.ok(avail.data.some((o) => o.o_id === orderId), "the rider's zone must match Karahi House's zone");
const claim = await rider.rpc("rider_claim_order", { p_order_id: orderId });
assert.ifError(claim.error);
assert.equal((await status("delivered")).error?.message, "invalid_transition");
assert.equal((await owner.rpc("owner_mark_ready", { p_order_id: orderId })).error?.message, "invalid_transition");
const myOrder = (await rider.rpc("rider_my_orders")).data.find((o) => o.o_id === orderId);
assert.equal((await owner.rpc("owner_handover", { p_order_id: orderId, p_code: myOrder.o_code })).data, "ok");
assert.ifError((await rider.rpc("rider_mark_delivered", { p_order_id: orderId })).error);

// The breakdown must match the rules exactly.
const d = (await admin.rpc("admin_order_detail", { p_id: orderId })).data[0];
const commission = Math.floor((d.d_subtotal * before.s_bps + 5000) / 10000);
const riderPay = Math.floor((d.d_fee * settings.c_rider_bps) / 10000);
assert.equal(d.d_status, "delivered");
assert.equal(d.d_total, d.d_subtotal + d.d_fee);
assert.equal(d.d_commission, commission);
assert.equal(d.d_rest_share, d.d_subtotal - commission);
assert.equal(d.d_rider_pay, riderPay);
assert.equal(d.d_platform_fee, d.d_fee - riderPay);
assert.equal(d.d_rider_id, riderId);

// Balances moved by exactly those amounts.
const after = (await admin.rpc("admin_restaurants", { p_id: karahi.id })).data[0];
assert.equal(after.s_owed - before.s_owed, d.d_rest_share);
wallet = (await rider.rpc("rider_wallet")).data[0];
assert.equal(wallet.w_held, d.d_total); // riders now hand in ALL the cash

// Settlements: cannot overpay, cannot take zero, exact amounts work and clear the balance.
const owed = after.s_owed;
assert.equal((await admin.rpc("admin_record_payout", { p_restaurant: karahi.id, p_amount: owed + 1, p_note: null })).error?.message, "exceeds_balance");
assert.equal((await admin.rpc("admin_record_payout", { p_restaurant: karahi.id, p_amount: 0, p_note: null })).error?.message, "bad_amount");
assert.ifError((await admin.rpc("admin_record_payout", { p_restaurant: karahi.id, p_amount: owed, p_note: "TEST payout" })).error);
assert.equal((await admin.rpc("admin_restaurants", { p_id: karahi.id })).data[0].s_owed, 0);
assert.equal((await admin.rpc("admin_record_deposit", { p_rider: riderId, p_amount: wallet.w_held + 1, p_note: null })).error?.message, "exceeds_balance");
assert.ifError((await admin.rpc("admin_record_deposit", { p_rider: riderId, p_amount: wallet.w_held, p_note: "TEST deposit" })).error);
assert.equal((await rider.rpc("rider_wallet")).data[0].w_held, 0);

console.log("ledger: all checks passed");