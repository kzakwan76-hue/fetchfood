import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && process.env.TEST_EMAIL && process.env.TEST_PASSWORD, "env vars missing");

const NIL = "00000000-0000-0000-0000-000000000000";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const user = createClient(url, key, opts);
const ADDRESS = `TEST ADDRESS house 99 street 9 ${Date.now()}`;

// 1. Logged-out visitors are refused everywhere.
let r = await anon.rpc("save_address", { p_label: "x", p_address: ADDRESS });
assert.ok(r.error, "anon save_address must be refused");
r = await anon.rpc("toggle_favorite", { p_restaurant_id: NIL });
assert.ok(r.error, "anon toggle_favorite must be refused");
for (const table of ["saved_addresses", "favorites"]) {
  const read = await anon.from(table).select("*");
  assert.ok(read.error || (read.data ?? []).length === 0, `anon must not read ${table}`);
}

const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");

// 2. Direct writes are refused.
r = await user.from("saved_addresses").insert({ user_id: login.data.user.id, label: "x", address: ADDRESS });
assert.ok(r.error, "direct address insert must be refused");
r = await user.from("favorites").insert({ user_id: login.data.user.id, restaurant_id: NIL });
assert.ok(r.error, "direct favourite insert must be refused");

// 3. Validation.
r = await user.rpc("save_address", { p_label: "Home", p_address: "short" });
assert.match(r.error?.message ?? "", /bad_address/);
r = await user.rpc("toggle_favorite", { p_restaurant_id: NIL });
assert.match(r.error?.message ?? "", /restaurant_not_found/);

// 4. Happy path: addresses.
r = await user.rpc("save_address", { p_label: "Test", p_address: ADDRESS });
assert.ifError(r.error);
r = await user.rpc("save_address", { p_label: "Test", p_address: ADDRESS }); // duplicate: no error, no second row
assert.ifError(r.error);
let rows = await user.from("saved_addresses").select("id").eq("address", ADDRESS);
assert.ifError(rows.error);
assert.equal(rows.data.length, 1, "the same address must be stored once");
const del = await user.from("saved_addresses").delete().eq("id", rows.data[0].id).select("id");
assert.ifError(del.error);
assert.equal(del.data.length, 1, "owner can delete their own address");

// 5. Happy path: favourites.
const { data: rest } = await anon.from("restaurants").select("id").eq("slug", "karahi-house").single();
r = await user.rpc("toggle_favorite", { p_restaurant_id: rest.id });
assert.ifError(r.error);
assert.equal(r.data, true);
rows = await user.from("favorites").select("restaurant_id").eq("restaurant_id", rest.id);
assert.equal(rows.data.length, 1);
r = await user.rpc("toggle_favorite", { p_restaurant_id: rest.id });
assert.ifError(r.error);
assert.equal(r.data, false);

console.log("customer: all checks passed");