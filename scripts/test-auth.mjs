import assert from "node:assert/strict";
import { validateEmail, validatePassword, validateFullName } from "../lib/auth-validation.ts";

assert.equal(validateEmail("a@b.co"), null);
assert.ok(validateEmail("nope"));
assert.ok(validateEmail("a@b"));
assert.ok(validateEmail("a b@c.com"));

assert.equal(validatePassword("12345678"), null);
assert.ok(validatePassword("1234567"));

assert.equal(validateFullName("Ali Khan"), null);
assert.ok(validateFullName(" A "));

console.log("auth-validation.ts: all checks passed");