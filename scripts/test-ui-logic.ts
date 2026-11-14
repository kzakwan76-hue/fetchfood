import assert from "node:assert/strict";
import { CATEGORIES, matchesCategory, parseCategory } from "../lib/cuisine";
import { landingFor, parseRole } from "../lib/auth-role";

// Categories
assert.equal(new Set(CATEGORIES.map((c) => c.key)).size, CATEGORIES.length, "category keys must be unique");
assert.ok(matchesCategory("Pakistani", "desi"));
assert.ok(matchesCategory("Burgers & Fast Food", "burger"));
assert.ok(matchesCategory("Italian", "pizza"));
assert.ok(matchesCategory("BBQ & Grill", "bbq"));
assert.ok(matchesCategory("Coffee", "cafe"));
assert.ok(matchesCategory("Ice Cream", "dessert"));
assert.ok(!matchesCategory("Steak House", "cafe"), "steak must not match tea");
assert.ok(!matchesCategory("Pakistani Spice", "dessert"), "spice must not match ice");
assert.ok(!matchesCategory("Pakistani", "pizza"));
assert.ok(matchesCategory("Anything", null), "no category means show everything");
assert.equal(parseCategory("pizza"), "pizza");
assert.equal(parseCategory("nonsense"), null);
assert.equal(parseCategory(null), null);

// Role tabs: a landing hint only, with a fixed list of destinations.
assert.equal(parseRole("rider"), "rider");
assert.equal(parseRole("restaurant"), "restaurant");
assert.equal(parseRole("admin"), "customer", "admin must never be accepted from a form");
assert.equal(parseRole("<script>"), "customer");
assert.equal(parseRole(null), "customer");
assert.equal(landingFor("customer"), "/account");
assert.equal(landingFor("rider"), "/rider/apply");
assert.equal(landingFor("restaurant"), "/dashboard");

console.log("ui-logic: all checks passed");