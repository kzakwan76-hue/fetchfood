import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && process.env.TEST_EMAIL && process.env.TEST_PASSWORD, "env vars missing");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, key, opts);
const user = createClient(url, key, opts);
const BUCKET = "restaurant-photos";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const { data: rs, error: rsErr } = await anon
  .from("restaurants")
  .select("id, slug")
  .in("slug", ["karahi-house", "burger-lab"]);
assert.ifError(rsErr);
const karahi = rs.find((r) => r.slug === "karahi-house");
const burger = rs.find((r) => r.slug === "burger-lab");

const { data: items, error: itemsErr } = await anon
  .from("menu_items")
  .select("id, name, restaurant_id")
  .in("restaurant_id", [karahi.id, burger.id]);
assert.ifError(itemsErr);
const naan = items.find((i) => i.restaurant_id === karahi.id && i.name === "Naan");
const fries = items.find((i) => i.restaurant_id === burger.id && i.name === "Fries");
assert.ok(naan && fries, "seed dishes Naan and Fries are missing");
const stamp = Date.now();

// 1. Logged-out visitors cannot upload or set a dish photo.
let r = await anon.rpc("set_dish_photo", { p_item_id: naan.id, p_path: null });
assert.ok(r.error, "anon set_dish_photo must be refused");
r = await anon.storage
  .from(BUCKET)
  .upload(`${karahi.id}/dishes/${naan.id}-${stamp}.png`, PNG, { contentType: "image/png" });
assert.ok(r.error, "anon upload must be refused");

// 2. The TEST account owns Karahi House only.
const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");

r = await user.rpc("set_dish_photo", { p_item_id: fries.id, p_path: null });
assert.match(r.error?.message ?? "", /not_allowed/);
r = await user.rpc("set_dish_photo", {
  p_item_id: naan.id,
  p_path: `${karahi.id}/dishes/${fries.id}-${stamp}.png`,
});
assert.match(r.error?.message ?? "", /bad_path/);
r = await user.storage
  .from(BUCKET)
  .upload(`${burger.id}/dishes/${fries.id}-${stamp}.png`, PNG, { contentType: "image/png" });
assert.ok(r.error, "upload into someone else's folder must be refused");

// 3. The owner's happy path: upload, set, read publicly, clear, delete.
const path = `${karahi.id}/dishes/${naan.id}-${stamp + 1}.png`;
r = await user.storage.from(BUCKET).upload(path, PNG, { contentType: "image/png" });
assert.ifError(r.error);
r = await user.rpc("set_dish_photo", { p_item_id: naan.id, p_path: path });
assert.ifError(r.error);
const read = await anon.from("menu_items").select("image_path").eq("id", naan.id).single();
assert.equal(read.data?.image_path, path);
const fetched = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${path}`);
assert.equal(fetched.status, 200, "the dish photo must be publicly readable");
r = await user.rpc("set_dish_photo", { p_item_id: naan.id, p_path: null });
assert.ifError(r.error);
assert.equal(r.data, path, "clearing returns the old path");
r = await user.storage.from(BUCKET).remove([path]);
assert.ifError(r.error);

console.log("dish photos: all checks passed");