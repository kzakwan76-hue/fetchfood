import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && process.env.TEST_EMAIL && process.env.TEST_PASSWORD, "env vars missing");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const user = createClient(url, key, opts);

const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");

const { data: karahi, error } = await anon
  .from("restaurants")
  .select("id, zone_id, menu_items(id, name)")
  .eq("slug", "karahi-house")
  .single();
assert.ifError(error);
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");

const place = (idem) =>
  user.rpc("place_order", {
    p_restaurant_id: karahi.id,
    p_items: [{ menu_item_id: chicken.id, quantity: 1 }],
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-idempotency.mjs)",
    p_zone_id: karahi.zone_id,
    p_idem: idem,
  });

// 1. Two identical requests at the same moment create ONE order.
const k1 = randomUUID();
const [a, b] = await Promise.all([place(k1), place(k1)]);
assert.ifError(a.error);
assert.ifError(b.error);
assert.equal(a.data, b.data, "both calls must return the same order");
const count = await user.from("orders").select("id").eq("idempotency_key", k1);
assert.ifError(count.error);
assert.equal(count.data.length, 1, "exactly one order for one key");

// 2. A later retry with the same key still returns that order.
const c = await place(k1);
assert.ifError(c.error);
assert.equal(c.data, a.data);

// 3. A different key is a different order. No key at all still works (older callers).
const k2 = randomUUID();
const d = await place(k2);
assert.ifError(d.error);
assert.notEqual(d.data, a.data);
const e = await place(null);
assert.ifError(e.error);
assert.notEqual(e.data, d.data);

// Clean up: cancel the test orders so none stay active (the TEST account owns Karahi House).
for (const id of [a.data, d.data, e.data]) {
  const r = await user.rpc("update_order_status", { p_order_id: id, p_new: "cancelled" });
  assert.ifError(r.error);
}

console.log("idempotency: all checks passed");