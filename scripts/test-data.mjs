import assert from "node:assert/strict";
import { restaurants, getRestaurant } from "../lib/sample-data.ts";

const slugs = restaurants.map((r) => r.slug);
assert.equal(new Set(slugs).size, slugs.length, "duplicate restaurant slug");

const ids = restaurants.flatMap((r) => r.items.map((i) => i.id));
assert.equal(new Set(ids).size, ids.length, "duplicate menu item id");

for (const r of restaurants) {
  assert.ok(r.items.length > 0, `${r.slug} has no items`);
  for (const n of [r.deliveryFeePkr, r.minOrderPkr, ...r.items.map((i) => i.pricePkr)]) {
    assert.ok(Number.isInteger(n) && n >= 0, `${r.slug}: bad price ${n}`);
  }
  for (const i of r.items) assert.ok(i.pricePkr > 0, `${i.id} price must be above 0`);
}

assert.equal(getRestaurant("nope"), undefined);
console.log("sample-data.ts: all checks passed");