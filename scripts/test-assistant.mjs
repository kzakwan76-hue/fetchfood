// Run from the project root:  node --no-warnings scripts\test-assistant.mjs
import assert from "node:assert/strict";
import { parseBudget, extractTerms, recommendByRules } from "../lib/assistant/recommend.ts";
import { parseModelOutput, applyGuard, SAFE_REPLY, MAX_PICKS } from "../lib/assistant/guard.ts";

const karahi = { restaurantId: "r1", restaurantSlug: "karahi-house", restaurantName: "Karahi House" };
const burger = { restaurantId: "r2", restaurantSlug: "burger-lab", restaurantName: "Burger Lab" };
const biryani = { restaurantId: "r3", restaurantSlug: "biryani-junction", restaurantName: "Biryani Junction" };
const dhaba = { restaurantId: "r4", restaurantSlug: "desi-dhaba", restaurantName: "Desi Dhaba" };

const item = (r, itemId, name, description, category, pricePkr, tags = [], canOrderNow = true) => ({
  ...r, itemId, name, description, category, pricePkr, tags, canOrderNow,
});

// Numbering for the AI is position + 1, so n=1 is items[0].
const items = [
  item(karahi, "i1", "Chicken Karahi", "Tomato, ginger and green chilli.", "Mains", 1450, ["spicy"]), // n=1
  item(karahi, "i2", "Daal Mash", "Slow-cooked white lentils.", "Mains", 450, ["vegetarian"]), // n=2
  item(burger, "i3", "Zinger Burger", "Crispy chicken, mayo, lettuce.", "Burgers", 550, ["spicy"]), // n=3
  item(burger, "i4", "Cheese Fries", "Fries with melted cheese sauce.", "Sides", 350, ["vegetarian"]), // n=4
  item(burger, "i5", "Cheesy Beef Burger", "Double patty, melted cheese.", "Burgers", 750), // n=5
  item(dhaba, "i6", "Chicken Handi", "Creamy, mildly spiced.", "Mains", 1300, [], false), // n=6 (closed)
  item(biryani, "i7", "Chicken Biryani", "Single plate with raita.", "Rice", 450, ["spicy"]), // n=7
  item(biryani, "i8", "Zarda", "Sweet rice dessert.", "Dessert", 200, ["vegetarian"]), // n=8
];

// ---- parseBudget ----
assert.equal(parseBudget("spicy and cheesy, my budget is Rs. 800"), 800);
assert.equal(parseBudget("something under 1,200"), 1200);
assert.equal(parseBudget("I have 800 rupees"), 800);
assert.equal(parseBudget("pkr1500 please"), 1500);
assert.equal(parseBudget("deliver within 30 minutes"), null, "minutes are not rupees");
assert.equal(parseBudget("food for 40 people"), null, "people are not rupees");
assert.equal(parseBudget("Rs. 5"), null, "too small to be a real budget");
assert.equal(parseBudget(""), null);

// ---- extractTerms ----
assert.deepEqual(extractTerms("I'm craving something spicy and cheesy"), ["spicy", "cheese", "cheesy"]);
assert.deepEqual(extractTerms("I'm hungry"), []);

// ---- rule-based assistant ----
{
  const a = recommendByRules("spicy and cheesy, budget Rs. 800", items);
  assert.equal(a.source, "rules");
  assert.ok(a.picks.length >= 1 && a.picks.length <= 3);
  assert.ok(a.picks.some((p) => p.item.name === "Cheesy Beef Burger"));
  for (const p of a.picks) {
    assert.ok(items.includes(p.item), "pick must be a real item");
    assert.ok(p.item.pricePkr <= 800, "pick must respect the budget");
    assert.ok(p.item.canOrderNow, "pick must be orderable");
  }
}
{
  const a = recommendByRules("I'm hungry", items);
  assert.equal(a.picks.length, 0);
  assert.match(a.reply, /craving|budget/i);
}
assert.equal(recommendByRules("sushi", items).picks.length, 0);
{
  const a = recommendByRules("I have Rs. 400", items);
  assert.deepEqual(a.picks.map((p) => p.item.name), ["Cheese Fries", "Zarda"]);
}
{
  const a = recommendByRules("chicken", items);
  assert.ok(a.picks.every((p) => p.item.name !== "Chicken Handi"), "closed restaurant must never be suggested");
}
assert.equal(recommendByRules("spicy", items.map((i) => ({ ...i, canOrderNow: false }))).picks.length, 0);

// ---- parseModelOutput ----
assert.deepEqual(parseModelOutput('{"reply":"Hi","picks":[{"n":3,"reason":"Spicy."}]}'), {
  reply: "Hi",
  picks: [{ n: 3, reason: "Spicy." }],
});
assert.deepEqual(
  parseModelOutput('Sure!\n```json\n{"reply":"Hi","picks":[]}\n```'),
  { reply: "Hi", picks: [] },
  "must cope with code fences and chatter",
);
assert.equal(parseModelOutput("no json here"), null);
assert.equal(parseModelOutput('{"picks":[]}'), null, "reply is required");
assert.equal(parseModelOutput("{broken json}"), null);
assert.deepEqual(
  parseModelOutput('{"reply":"Hi","picks":[{"n":"3","reason":"x"},{"n":2.5,"reason":"x"},{"n":2,"reason":5},null,{"n":2,"reason":"ok"}]}').picks,
  [{ n: 2, reason: "ok" }],
  "malformed picks are ignored",
);

// ---- the guard ----
const out = (reply, picks) => ({ reply, picks });

{
  const g = applyGuard(out("Try this.", [{ n: 99, reason: "x" }]), items, null);
  assert.equal(g, null, "an answer whose only pick is invented must be rejected");
}
{
  const g = applyGuard(out("Two ideas.", [{ n: 99, reason: "x" }, { n: 3, reason: "Crispy." }]), items, null);
  assert.deepEqual(g.picks.map((p) => p.item.itemId), ["i3"]);
  assert.ok(g.notes.some((n) => n.includes("no such menu item")));
}
{
  const g = applyGuard(out("Try these.", [{ n: 6, reason: "x" }, { n: 4, reason: "Cheesy." }]), items, null);
  assert.deepEqual(g.picks.map((p) => p.item.itemId), ["i4"], "closed item is dropped");
}
{
  const g = applyGuard(out("Under budget.", [{ n: 1, reason: "x" }, { n: 4, reason: "ok" }]), items, 800);
  assert.deepEqual(g.picks.map((p) => p.item.itemId), ["i4"], "over-budget item is dropped");
}
{
  const g = applyGuard(out("Dupes.", [{ n: 4, reason: "a" }, { n: 4, reason: "b" }]), items, null);
  assert.equal(g.picks.length, 1);
}
{
  const many = [1, 2, 3, 4, 5, 7, 8].map((n) => ({ n, reason: "ok" }));
  assert.equal(applyGuard(out("Lots.", many), items, null).picks.length, MAX_PICKS);
}
{
  const g = applyGuard(out("Go for [[5]], it is very cheesy.", [{ n: 5, reason: "Same as [[5]]." }]), items, null);
  assert.equal(g.reply, "Go for Cheesy Beef Burger, it is very cheesy.", "markers become real dish names");
  assert.equal(g.picks[0].reason, "Same as Cheesy Beef Burger.");
}
{
  const g = applyGuard(out("Try [[42]], it is great.", [{ n: 4, reason: "ok" }]), items, null);
  assert.equal(g.reply, SAFE_REPLY, "a reply naming an unknown dish is replaced");
  assert.equal(g.picks.length, 1, "valid picks are kept");
}
for (const bad of ["It is only Rs. 450!", "That costs 450 rupees.", "PKR 99 only", "Just 1450 for this one.", "only Rs99", "450rs", "pkr450"]) {
  const g = applyGuard(out(bad, [{ n: 4, reason: "ok" }]), items, null);
  assert.equal(g.reply, SAFE_REPLY, `price claim must be removed: ${bad}`);
}
{
  const g = applyGuard(out("This fits your 800 budget nicely.", [{ n: 4, reason: "ok" }]), items, 800);
  assert.equal(g.reply, "This fits your 800 budget nicely.", "repeating the customer's own budget is fine");
}
{
  const g = applyGuard(out("Only Rs. 350 for this.", [{ n: 4, reason: "Just 350 rupees." }]), items, null);
  assert.equal(g.picks[0].reason, "Matches what you asked for.", "a reason that states a price is replaced");
}
{
  const g = applyGuard(out("What kind of spice level do you like?", []), items, null);
  assert.equal(g.picks.length, 0);
  assert.equal(g.reply, "What kind of spice level do you like?", "a follow-up question with no picks is allowed");
}
assert.equal(applyGuard(out("   ", []), items, null), null, "an empty answer is rejected");

// ---- fuzz: whatever the AI sends, every returned pick is real, orderable and in budget ----
{
  let seed = 12345;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let run = 0; run < 500; run++) {
    const budget = rand() < 0.5 ? null : 100 + Math.floor(rand() * 1500);
    const picks = Array.from({ length: Math.floor(rand() * 7) }, () => ({
      n: Math.floor(rand() * 30) - 5,
      reason: rand() < 0.3 ? "Rs. 99 only [[77]]" : "fine",
    }));
    const g = applyGuard(out(rand() < 0.5 ? "Hello [[3]]" : "Cost 999", picks), items, budget);
    if (g === null) continue;
    assert.ok(g.picks.length <= MAX_PICKS);
    for (const p of g.picks) {
      assert.ok(items.includes(p.item), "fuzz: invented item returned");
      assert.ok(p.item.canOrderNow, "fuzz: closed item returned");
      assert.ok(budget === null || p.item.pricePkr <= budget, "fuzz: over-budget item returned");
      assert.ok(!/rs\.?\s*\d|\d\s*rupees/i.test(p.reason), "fuzz: price in reason");
    }
  }
}

console.log("assistant: all checks passed");