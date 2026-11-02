import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const { TEST_EMAIL, TEST_PASSWORD, RIDER_EMAIL, RIDER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
assert.ok(url && key && TEST_EMAIL && TEST_PASSWORD, "env vars missing");

const NIL = "00000000-0000-0000-0000-000000000000";
const BUCKET = "rider-documents";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const owner = createClient(url, key, opts);
const login = async (client, email, password, who) => {
  const r = await client.auth.signInWithPassword({ email, password });
  assert.ok(!r.error, `${who} login failed`);
  return r.data.user.id;
};
await login(owner, TEST_EMAIL, TEST_PASSWORD, "test owner");

const appArgs = (o = {}) => ({
  p_legal_name: "Test Rider", p_cnic: "1234512345671", p_father: "Test Father", p_dob: "1995-01-01",
  p_address: "House 1 Street 2 Lahore", p_em_name: "Em Contact", p_em_phone: "03001234567",
  p_vehicle_type: "bike", p_vehicle_reg: null, p_g_name: "Guarantor", p_g_phone: "03007654321",
  p_front: "x", p_back: "x", p_selfie: "x", ...o,
});

// 1. Anonymous visitors are refused everywhere.
for (const [fn, args] of [
  ["submit_rider_application", appArgs()],
  ["rider_my_application", {}],
  ["rider_confirm_call", { p_order_id: NIL }],
  ["my_unread_notifications", {}],
  ["mark_notifications_read", {}],
  ["admin_rider_applications", {}],
  ["admin_rider_kyc", { p_id: NIL }],
  ["admin_review_rider", { p_user: NIL, p_action: "approve", p_zone: null, p_limit: null, p_deposit: 0, p_note: null }],
  ["admin_order_call", { p_id: NIL }],
]) {
  assert.ok((await anon.rpc(fn, args)).error, `anon must be refused: ${fn}`);
}

// 2. A logged-in non-admin owner.
for (const [fn, args] of [
  ["admin_rider_applications", {}],
  ["admin_rider_kyc", { p_id: NIL }],
  ["admin_review_rider", { p_user: NIL, p_action: "approve", p_zone: null, p_limit: null, p_deposit: 0, p_note: null }],
  ["admin_order_call", { p_id: NIL }],
]) {
  assert.match((await owner.rpc(fn, args)).error?.message ?? "", /not_admin/, `not_admin expected: ${fn}`);
}
assert.match((await owner.rpc("submit_rider_application", appArgs())).error?.message ?? "", /not_allowed/);
assert.match((await owner.rpc("rider_confirm_call", { p_order_id: NIL })).error?.message ?? "", /not_rider/);
assert.ok((await owner.from("rider_profiles").select("*")).error, "rider_profiles must not be readable");
assert.ok((await owner.from("notifications").insert({ user_id: NIL, kind: "x", title: "x", body: "x" })).error, "notifications must not be writable");
assert.ok((await anon.storage.from(BUCKET).upload(`${NIL}/selfie-1700000000000.png`, PNG, { contentType: "image/png" })).error, "anon upload must be refused");
console.log("refusals ok");

// 3. Notifications happy path: placing an order tells the restaurant owner.
const { data: karahi, error: kErr } = await anon
  .from("restaurants").select("id, zone_id, menu_items(id, name)").eq("slug", "karahi-house").single();
assert.ifError(kErr);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");
const placed = await owner.rpc("place_order", {
  p_restaurant_id: karahi.id, p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
  p_address: "House 1, Street 2, Sample Area A, Test City", p_phone: "03001234567",
  p_note: "TEST ORDER (scripts/test-rider-kyc.mjs)", p_zone_id: karahi.zone_id,
});
assert.ifError(placed.error);
const short = placed.data.slice(0, 8);
const notes = await owner.from("notifications").select("title, read_at").order("created_at", { ascending: false }).limit(20);
assert.ifError(notes.error);
assert.ok(notes.data.some((n) => n.title.includes(short)), "the owner must be notified of the new order");
assert.ok((await owner.rpc("my_unread_notifications")).data >= 1);
assert.ifError((await owner.rpc("mark_notifications_read")).error);
assert.equal((await owner.rpc("my_unread_notifications")).data, 0);
assert.ifError((await owner.rpc("update_order_status", { p_order_id: placed.data, p_new: "cancelled" })).error);
console.log("notifications ok");

if (!RIDER_EMAIL || !RIDER_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("rider-kyc: refusals and notifications passed (private-bucket flow skipped: add RIDER_* and ADMIN_*)");
  process.exit(0);
}

// 4. Rider documents bucket: own folder works, others' folders and other users are refused, admin can read.
const rider = createClient(url, key, opts);
const admin = createClient(url, key, opts);
const riderId = await login(rider, RIDER_EMAIL, RIDER_PASSWORD, "rider");
await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
const stamp = Date.now();
const own = `${riderId}/selfie-${stamp}.png`;

assert.ok((await rider.storage.from(BUCKET).upload(`${NIL}/selfie-${stamp}.png`, PNG, { contentType: "image/png" })).error, "upload into another folder must be refused");
assert.ifError((await rider.storage.from(BUCKET).upload(own, PNG, { contentType: "image/png" })).error);
assert.ok((await owner.storage.from(BUCKET).createSignedUrl(own, 60)).error, "another user must not read the file");
const signed = await admin.storage.from(BUCKET).createSignedUrl(own, 60);
assert.ifError(signed.error);
assert.equal((await fetch(signed.data.signedUrl)).status, 200, "admin must be able to open the document");
assert.ok((await rider.storage.from(BUCKET).remove([own])).data?.length === 0, "the rider must not be able to delete");
const removed = await admin.storage.from(BUCKET).remove([own]);
assert.ifError(removed.error);
assert.equal(removed.data.length, 1, "admin cleanup");

// 5. Application checks that write nothing.
assert.match((await rider.rpc("submit_rider_application", appArgs({ p_cnic: "123" }))).error?.message ?? "", /bad_cnic/);
assert.match((await rider.rpc("submit_rider_application", appArgs({ p_dob: "2015-01-01" }))).error?.message ?? "", /bad_dob/);
assert.match((await rider.rpc("submit_rider_application", appArgs())).error?.message ?? "", /bad_path/);
assert.match((await rider.rpc("rider_confirm_call", { p_order_id: NIL })).error?.message ?? "", /order_not_found/);

console.log("rider-kyc: all checks passed");