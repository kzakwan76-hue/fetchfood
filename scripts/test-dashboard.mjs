import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  TEST_EMAIL: email,
  TEST_PASSWORD: password,
} = process.env;
if (!url || !key || !email || !password) {
  console.error("Missing env vars. Run: node --no-warnings --env-file=.env.local scripts\\test-dashboard.mjs");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const user = createClient(url, key, opts);
let passed = 0;
const ok = (name) => console.log("ok  ", ++passed, name);

const place = (restaurantId, items) =>
  user.rpc("place_order", {
    p_restaurant_id: restaurantId,
    p_items: items,
    p_address: "House 1, Street 2, Sample Area A, Test City",
    p_phone: "03001234567",
    p_note: "TEST ORDER (scripts/test-dashboard.mjs)",
  });
const setStatus = (id, status) => user.rpc("update_order_status", { p_order_id: id, p_new: status });
const refused = (r) => Boolean(r.error) || (Array.isArray(r.data) && r.data.length === 0);

let r = await anon.rpc("update_order_status", {
  p_order_id: "00000000-0000-0000-0000-000000000000",
  p_new: "accepted",
});
assert.ok(r.error, "anonymous status change should be refused");
ok("anonymous users cannot change order status");

const { error: signInErr } = await user.auth.signInWithPassword({ email, password });
assert.ifError(signInErr);
const me = (await user.auth.getUser()).data.user.id;

const { data: rs, error: rsErr } = await user
  .from("restaurants")
  .select("id, slug, owner_id, menu_items(id, name, price_pkr)")
  .in("slug", ["karahi-house", "burger-lab"]);
assert.ifError(rsErr);
const karahi = rs.find((x) => x.slug === "karahi-house");
const burger = rs.find((x) => x.slug === "burger-lab");
assert.equal(karahi.owner_id, me, "Step 2 not done: this test account must own karahi-house");
assert.notEqual(burger.owner_id, me, "this test account must NOT own burger-lab");
const chicken = karahi.menu_items.find((i) => i.name === "Chicken Karahi (half)");
const zinger = burger.menu_items.find((i) => i.name === "Zinger Burger");
ok("test account owns Karahi House and not Burger Lab");

// Owner: full order lifecycle, and the sequence is enforced
r = await place(karahi.id, [{ menu_item_id: chicken.id, quantity: 1 }]);
assert.ifError(r.error);
const own = r.data;
assert.ifError((await setStatus(own, "accepted")).error);
assert.equal((await setStatus(own, "delivered")).error?.message, "invalid_transition");
assert.ifError((await setStatus(own, "preparing")).error);
assert.ifError((await setStatus(own, "out_for_delivery")).error);
assert.ifError((await setStatus(own, "delivered")).error);
assert.equal((await setStatus(own, "cancelled")).error?.message, "invalid_transition");
ok("owner moves an order through the allowed steps; skipping or reversing is refused");

// Non-owner customer: may only cancel their own order while it is "placed"
r = await place(burger.id, [{ menu_item_id: zinger.id, quantity: 1 }]);
assert.ifError(r.error);
const mine = r.data;
assert.equal((await setStatus(mine, "accepted")).error?.message, "invalid_transition");
assert.ifError((await setStatus(mine, "cancelled")).error);
assert.equal((await setStatus(mine, "cancelled")).error?.message, "invalid_transition");
ok("a customer can cancel only their own placed order, and cannot accept it");

// Owner permissions on restaurants
r = await user.from("restaurants").update({ min_order_pkr: 1 }).eq("id", karahi.id).select();
assert.ok(r.error, "owner must not edit the minimum order");
ok("owner cannot change the platform minimum order");

r = await user.from("restaurants").update({ is_open: false }).eq("id", karahi.id).select("id");
assert.ifError(r.error);
assert.equal(r.data.length, 1);
r = await user.from("restaurants").update({ is_open: true }).eq("id", karahi.id).select("id");
assert.ifError(r.error);
ok("owner can open/close their own restaurant");

r = await user.from("restaurants").update({ is_open: false }).eq("id", burger.id).select("id");
assert.ok(refused(r), "must not edit someone else's restaurant");
ok("owner cannot open/close another restaurant");

// Owner permissions on menu items
r = await user
  .from("menu_items")
  .insert({ restaurant_id: karahi.id, name: "TEST ITEM", category: "Test", price_pkr: 123 })
  .select("id");
assert.ifError(r.error);
const testItem = r.data[0].id;
r = await user.from("menu_items").update({ price_pkr: 456 }).eq("id", testItem).select("price_pkr");
assert.ifError(r.error);
assert.equal(r.data[0].price_pkr, 456);
r = await user.from("menu_items").delete().eq("id", testItem).select("id");
assert.ifError(r.error);
assert.equal(r.data.length, 1);
ok("owner can add, reprice and delete items of their own restaurant");

r = await user
  .from("menu_items")
  .insert({ restaurant_id: burger.id, name: "TEST ITEM", category: "Test", price_pkr: 123 })
  .select("id");
assert.ok(refused(r), "must not add items to another restaurant");
r = await user.from("menu_items").update({ price_pkr: 1 }).eq("id", zinger.id).select("id");
assert.ok(refused(r), "must not reprice another restaurant's item");
ok("owner cannot add or reprice items of another restaurant");

for (const price of [0, 1000000]) {
  r = await user
    .from("menu_items")
    .insert({ restaurant_id: karahi.id, name: "TEST ITEM", category: "Test", price_pkr: price })
    .select("id");
  assert.ok(r.error, `price ${price} should be refused`);
}
ok("prices outside 1-100000 are refused");

console.log(`\n${passed} dashboard checks passed. Two TEST ORDERS were created (see their notes).`);