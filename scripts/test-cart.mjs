import assert from "node:assert/strict";
import {
  EMPTY_CART, MAX_QTY, addItem, setQuantity, subtotalPkr, totalPkr,
  meetsMinimum, itemCount, parseCart,
} from "../lib/cart.ts";

const rA = { id: "r-a", slug: "a", name: "A", deliveryFeePkr: 150, minOrderPkr: 800 };
const rB = { id: "r-b", slug: "b", name: "B", deliveryFeePkr: 100, minOrderPkr: 0 };
const karahi = { id: "i-1", name: "Karahi", pricePkr: 1450 };
const naan = { id: "i-2", name: "Naan", pricePkr: 40 };

let c = addItem(EMPTY_CART, rA, karahi);
c = addItem(c, rA, naan);
c = addItem(c, rA, naan);
assert.equal(itemCount(c), 3);
assert.equal(subtotalPkr(c), 1450 + 80);
assert.equal(totalPkr(c), 1450 + 80 + 150);
assert.ok(meetsMinimum(c));
assert.ok(Number.isInteger(subtotalPkr(c)) && Number.isInteger(totalPkr(c)));

// switching restaurant starts a new cart
const c2 = addItem(c, rB, naan);
assert.equal(c2.restaurantId, "r-b");
assert.equal(c2.lines.length, 1);
assert.equal(c2.deliveryFeePkr, 100);

// quantity rules
assert.equal(setQuantity(c, "i-2", 0).lines.length, 1);
assert.equal(setQuantity(c, "i-2", 999).lines.find((l) => l.menuItemId === "i-2").quantity, MAX_QTY);
assert.equal(setQuantity(c, "i-2", NaN), c);
assert.equal(setQuantity(addItem(EMPTY_CART, rA, naan), "i-2", 0), EMPTY_CART);

// minimum order
assert.equal(meetsMinimum(addItem(EMPTY_CART, rA, naan)), false);

// parseCart accepts a real cart and rejects garbage
assert.deepEqual(parseCart(JSON.parse(JSON.stringify(c))), c);
const good = JSON.parse(JSON.stringify(c));
for (const bad of [
  null, "x", 42, {}, { ...good, lines: "no" }, { ...good, lines: [] },
  { ...good, deliveryFeePkr: -1 }, { ...good, deliveryFeePkr: 1.5 },
  { ...good, lines: [{ ...good.lines[0], quantity: 21 }] },
  { ...good, lines: [{ ...good.lines[0], quantity: 0 }] },
  { ...good, lines: [{ ...good.lines[0], pricePkr: 1.5 }] },
  { ...good, lines: [null] },
]) {
  assert.equal(parseCart(bad), EMPTY_CART);
}

console.log("cart.ts: all checks passed");