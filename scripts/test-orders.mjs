import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  TEST_EMAIL: email,
  TEST_PASSWORD: password,
} = process.env;
if (!url || !key || !email || !password) {
  console.error("Missing env vars. Add TEST_EMAIL and TEST_PASSWORD to .env.local, then run:");
  console.error("node --no-warnings --env-file=.env.local scripts\\test-orders.mjs");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const user = createClient(url, key, opts);

const place = (client, restaurantId, items) =>
  client.rpc("place_order", {
    p_restaurant_id: restaurantId,
    p_items: items,
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-orders.mjs)",
  });
let passed = 0;
const ok = (name) => console.log("ok  ", ++passed, name);

// Public catalog read
const { data: restaurants, error: catErr } = await anon
  .from("restaurants")
  .select("id, slug, delivery_fee_pkr, min_order_pkr, menu_items(id, name, price_pkr)");
assert.ifError(catErr);
const bySlug = (s) => restaurants.find((r) => r.slug === s);
const karahi = bySlug("karahi-house");
const burger = bySlug("burger-lab");
const dhaba = bySlug("desi-dhaba");
assert.ok(karahi && burger && dhaba, "seed data missing: did the migration run?");
const itemOf = (r, name) => r.menu_items.find((i) => i.name === name);
const chicken = itemOf(karahi, "Chicken Karahi (half)");
const naan = itemOf(karahi, "Naan");
const zinger = itemOf(burger, "Zinger Burger");
ok("anonymous visitors can read the catalog");

let r = await place(anon, karahi.id, [{ menu_item_id: chicken.id, quantity: 1 }]);
assert.ok(r.error, "anonymous order should be refused");
ok("anonymous visitors cannot place orders");

const { error: signInErr } = await user.auth.signInWithPassword({ email, password });
assert.ifError(signInErr);
const userId = (await user.auth.getUser()).data.user.id;

r = await user.from("orders").insert({
  customer_id: userId, restaurant_id: karahi.id, subtotal_pkr: 1, delivery_fee_pkr: 0,
  total_pkr: 1, delivery_address: "x".repeat(12), phone: "03001234567",
});
assert.ok(r.error, "direct insert into orders should be refused");
ok("logged-in users cannot insert orders directly");

// Tampered prices must be ignored
r = await place(user, karahi.id, [
  { menu_item_id: chicken.id, quantity: 1, price: 1, price_pkr: 1, unit_price_pkr: 1 },
  { menu_item_id: naan.id, quantity: 2, price: 1 },
]);
assert.ifError(r.error);
const orderId = r.data;
const { data: saved, error: readErr } = await user
  .from("orders")
  .select("subtotal_pkr, total_pkr")
  .eq("id", orderId)
  .single();
assert.ifError(readErr);
const expectedSubtotal = chicken.price_pkr + 2 * naan.price_pkr;
assert.equal(saved.subtotal_pkr, expectedSubtotal);
assert.equal(saved.total_pkr, expectedSubtotal + karahi.delivery_fee_pkr);
ok("order total comes from database prices; tampered prices are ignored");

r = await user.from("orders").update({ total_pkr: 1, subtotal_pkr: 1 }).eq("id", orderId).select();
assert.ok(r.error || r.data.length === 0, "customers must not edit orders");
ok("customers cannot edit their own order");

r = await place(user, karahi.id, [{ menu_item_id: naan.id, quantity: 1 }]);
assert.equal(r.error?.message, "below_minimum");
ok("below minimum order is refused");

r = await place(user, dhaba.id, [{ menu_item_id: dhaba.menu_items[0].id, quantity: 1 }]);
assert.equal(r.error?.message, "restaurant_unavailable");
ok("closed restaurant is refused");

for (const q of [0, -1, 21]) {
  r = await place(user, karahi.id, [{ menu_item_id: chicken.id, quantity: q }]);
  assert.equal(r.error?.message, "invalid_items", `quantity ${q}`);
}
ok("quantities outside 1-20 are refused");

r = await place(user, karahi.id, [{ menu_item_id: zinger.id, quantity: 1 }]);
assert.equal(r.error?.message, "invalid_items");
ok("an item from another restaurant is refused");

r = await place(user, karahi.id, []);
assert.equal(r.error?.message, "bad_items");
ok("an empty order is refused");

console.log(`\n${passed} order checks passed. One real test order was created (note says TEST ORDER).`);