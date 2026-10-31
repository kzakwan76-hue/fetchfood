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
const stamp = Date.now();

// 1. Logged-out visitors cannot upload or set a photo.
let r = await anon.storage.from(BUCKET).upload(`${karahi.id}/${stamp}.png`, PNG, { contentType: "image/png" });
assert.ok(r.error, "anon upload must be refused");
r = await anon.rpc("set_restaurant_photo", { p_restaurant_id: karahi.id, p_path: null });
assert.ok(r.error, "anon set_restaurant_photo must be refused");

// 2. The TEST account owns Karahi House only.
const login = await user.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ok(!login.error, "test login failed");

r = await user.storage.from(BUCKET).upload(`${burger.id}/${stamp}.png`, PNG, { contentType: "image/png" });
assert.ok(r.error, "upload into someone else's folder must be refused");
r = await user.rpc("set_restaurant_photo", { p_restaurant_id: burger.id, p_path: null });
assert.match(r.error?.message ?? "", /not_allowed/);
r = await user.rpc("set_restaurant_photo", {
  p_restaurant_id: karahi.id,
  p_path: `${burger.id}/${stamp}.png`,
});
assert.match(r.error?.message ?? "", /bad_path/);

// 3. The bucket itself refuses wrong types and oversize files, even for the owner.
r = await user.storage
  .from(BUCKET)
  .upload(`${karahi.id}/${stamp + 1}.png`, Buffer.from("not an image"), { contentType: "text/plain" });
assert.ok(r.error, "non-image type must be refused");
r = await user.storage
  .from(BUCKET)
  .upload(`${karahi.id}/${stamp + 2}.png`, Buffer.alloc(2 * 1024 * 1024 + 10), { contentType: "image/png" });
assert.ok(r.error, "files over 2 MB must be refused");

// 4. The owner's happy path: upload, set, clear, delete.
const path = `${karahi.id}/${stamp + 3}.png`;
r = await user.storage.from(BUCKET).upload(path, PNG, { contentType: "image/png" });
assert.ifError(r.error);
r = await user.rpc("set_restaurant_photo", { p_restaurant_id: karahi.id, p_path: path });
assert.ifError(r.error);
const publicRead = await anon.from("restaurants").select("image_path").eq("id", karahi.id).single();
assert.equal(publicRead.data?.image_path, path);
const fetched = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${path}`);
assert.equal(fetched.status, 200, "the photo must be publicly readable");
r = await user.rpc("set_restaurant_photo", { p_restaurant_id: karahi.id, p_path: null });
assert.ifError(r.error);
assert.equal(r.data, path, "clearing returns the old path");
r = await user.storage.from(BUCKET).remove([path]);
assert.ifError(r.error);

console.log("photos: all checks passed");