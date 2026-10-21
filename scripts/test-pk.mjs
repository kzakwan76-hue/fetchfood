// Run from the project root:  node --no-warnings scripts/test-pk.mjs
import assert from "node:assert/strict";
import { formatPKR, isValidPkPhone, normalizePkPhone } from "../lib/pk.ts";

// Every valid way of writing the same number gives the same +92 result.
for (const ok of [
  "03001234567",
  "0300-1234567",
  "0300 1234567",
  "923001234567",
  "+923001234567",
  "+92 300 1234567",
  "00923001234567",
  "3001234567",
]) {
  assert.equal(normalizePkPhone(ok), "+923001234567", `should accept ${ok}`);
}

// Invalid numbers are rejected.
for (const bad of ["", "0300123456", "030012345678", "02001234567", "+14155552671", "abcdefghijk"]) {
  assert.equal(isValidPkPhone(bad), false, `should reject "${bad}"`);
}

// Prices in rupees.
assert.equal(formatPKR(0), "Rs. 0");
assert.equal(formatPKR(800), "Rs. 800");
assert.equal(formatPKR(1250), "Rs. 1,250");
assert.equal(formatPKR(-50), "-Rs. 50");
assert.equal(formatPKR(Number.NaN), "Rs. 0");

console.log("pk.ts: all checks passed");