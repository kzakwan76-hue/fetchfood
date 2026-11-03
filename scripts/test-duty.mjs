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

// 1. Refusals.
for (const [fn, args] of [
  ["admin_cancel_order", { p_order_id: NIL, p_reason: null }],
  ["admin_attention", {}],
  ["admin_stale_riders", {}],
  ["admin_record_rider_payout", { p_rider: NIL, p_amount: 1, p_note: null }],
  ["admin_add_credit", { p_rider: NIL, p_amount: 1, p_note: "test note" }],
  ["admin_update_rules", { p_require_duty: false, p_bonus: 0, p_cancel: 20 }],
]) {
  assert.ok((await anon.rpc(fn, args)).error, `anon must be refused: ${fn}`);
  assert.match((await owner.rpc(fn, args)).error?.message ?? "", /not_admin/, `not_admin expected: ${fn}`);
}
assert.ok((await anon.rpc("run_sweep")).error, "anon must not run the sweep");
assert.ok((await owner.rpc("sweep_stuck_orders")).error, "the raw sweep must not be callable");
assert.match((await owner.rpc("rider_set_duty", { p_on: true })).error?.message ?? "", /not_rider/);
assert.match((await owner.rpc("owner_handover", { p_order_id: NIL, p_code: "1234" })).error?.message ?? "", /order_not_found/);
assert.ok((await owner.from("orders").select("pickup_code")).error, "the pickup code must be hidden");
const open = await anon.rpc("zones_open_for_orders");
assert.ifError(open.error);
assert.ok(Array.isArray(open.data));
assert.ifError((await owner.rpc("run_sweep")).error);
console.log("refusals ok");

if (!RIDER_EMAIL || !RIDER_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("duty: refusal checks passed (full flow skipped: add RIDER_* and ADMIN_* to .env.local)");
  process.exit(0);
}

// 2. The full flow: on-duty rule, pickup code, handover, rider money.
const rider = createClient(url, key, opts);
const admin = createClient(url, key, opts);
const riderId = await login(rider, RIDER_EMAIL, RIDER_PASSWORD, "rider");
await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");

const { data: karahi, error: kErr } = await anon
  .from("restaurants").select("id, zone_id, menu_items(id, name)").eq("slug", "karahi-house").single();
assert.ifError(kErr);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");
const place = () =>
  owner.rpc("place_order", {
    p_restaurant_id: karahi.id,
    p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-duty.mjs)",
    p_zone_id: karahi.zone_id,
  });

const before = (await admin.rpc("admin_get_settings")).data[0];
const setRules = (on) =>
  admin.rpc("admin_update_rules", { p_require_duty: on, p_bonus: before.c_bonus, p_cancel: before.c_cancel });

try {
  // The on-duty rule blocks ordering when nobody is on duty.
  assert.ifError((await setRules(true)).error);
  await rider.rpc("rider_set_duty", { p_on: false });
  assert.equal((await place()).error?.message, "no_riders");
  assert.ok(!(await anon.rpc("zones_open_for_orders")).data.includes(karahi.zone_id));
  assert.ifError((await rider.rpc("rider_set_duty", { p_on: true })).error);
  assert.ok((await anon.rpc("zones_open_for_orders")).data.includes(karahi.zone_id));

  const placed = await place();
  assert.ifError(placed.error);
  const orderId = placed.data;
  const status = (to) => owner.rpc("update_order_status", { p_order_id: orderId, p_new: to });
  assert.ifError((await status("accepted")).error);
  assert.ifError((await status("preparing")).error);
  assert.ifError((await owner.rpc("owner_mark_ready", { p_order_id: orderId })).error);

  // The rider claims it and gets a secret code. The address stays hidden.
  assert.ifError((await rider.rpc("rider_claim_order", { p_order_id: orderId })).error);
  const mineOf = async () => (await rider.rpc("rider_my_orders")).data.find((o) => o.o_id === orderId);
  let mine = await mineOf();
  assert.equal(mine.o_status, "preparing");
  assert.match(mine.o_code, /^[0-9]{4}$/);
  assert.equal(mine.o_address, null, "the address must stay hidden before the handover");

  // The owner sees who is coming, and only the right code hands the food over.
  const who = await owner.rpc("owner_order_riders");
  assert.ifError(who.error);
  assert.ok(who.data.some((v) => v.v_order === orderId), "the owner must see which rider is coming");
  const wrong = mine.o_code === "0000" ? "1111" : "0000";
  assert.equal((await owner.rpc("owner_handover", { p_order_id: orderId, p_code: wrong })).data, "wrong_code");
  assert.equal((await owner.rpc("owner_handover", { p_order_id: orderId, p_code: mine.o_code })).data, "ok");
  mine = await mineOf();
  assert.equal(mine.o_status, "out_for_delivery");
  assert.ok(mine.o_address, "the address is shown after the handover");

  // After the handover the rider cannot give it back or go off duty, then delivers.
  assert.equal((await rider.rpc("rider_release_order", { p_order_id: orderId })).error?.message, "invalid_transition");
  assert.equal((await rider.rpc("rider_set_duty", { p_on: false })).error?.message, "has_active");
  assert.ifError((await rider.rpc("rider_mark_delivered", { p_order_id: orderId })).error);

  // Rider money: hand in ALL cash first, then get paid fees, bonuses and incentives.
  const detail = (await admin.rpc("admin_order_detail", { p_id: orderId })).data[0];
  const w = (await rider.rpc("rider_wallet")).data[0];
  assert.ok(w.w_held >= detail.d_total, "the rider holds the whole order total");
  assert.equal(
    (await admin.rpc("admin_record_rider_payout", { p_rider: riderId, p_amount: 1, p_note: null })).error?.message,
    "deposit_first",
  );
  assert.ifError((await admin.rpc("admin_record_deposit", { p_rider: riderId, p_amount: w.w_held, p_note: "TEST deposit" })).error);
  const w2 = (await rider.rpc("rider_wallet")).data[0];
  assert.equal(w2.w_held, 0);
  assert.ok(w2.w_owed >= detail.d_rider_pay);
  assert.ifError((await admin.rpc("admin_add_credit", { p_rider: riderId, p_amount: 25, p_note: "TEST incentive" })).error);
  const w3 = (await rider.rpc("rider_wallet")).data[0];
  assert.equal(w3.w_owed, w2.w_owed + 25);
  assert.equal(
    (await admin.rpc("admin_record_rider_payout", { p_rider: riderId, p_amount: w3.w_owed + 1, p_note: null })).error?.message,
    "exceeds_balance",
  );
  assert.ifError((await admin.rpc("admin_record_rider_payout", { p_rider: riderId, p_amount: w3.w_owed, p_note: "TEST payout" })).error);
  assert.equal((await rider.rpc("rider_wallet")).data[0].w_owed, 0);

  // An admin can cancel an order that is still open.
  const extra = await place();
  assert.ifError(extra.error);
  assert.ifError((await admin.rpc("admin_cancel_order", { p_order_id: extra.data, p_reason: "TEST cancel" })).error);
  assert.equal(
    (await admin.rpc("admin_cancel_order", { p_order_id: extra.data, p_reason: null })).error?.message,
    "invalid_transition",
  );
} finally {
  await setRules(before.c_require_duty); // always put the rule back, even if a check failed
  await rider.rpc("rider_set_duty", { p_on: false });
}

console.log("duty: all checks passed");