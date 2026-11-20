import assert from "node:assert/strict";
import { answerQuestion } from "../lib/assistant/answer.ts";
import { SAFE_REPLY } from "../lib/assistant/guard.ts";

function item(id, name, pricePkr, tags, description, canOrderNow = true) {
  return {
    itemId: id,
    restaurantId: "r1",
    restaurantSlug: "r1",
    restaurantName: "Test Kitchen",
    name,
    description,
    category: "Mains",
    pricePkr,
    tags,
    canOrderNow,
  };
}

// The AI sees only open dishes, numbered in order:
// [1] Chicken Biryani  [2] Zinger Burger  [3] Raita  [4] Beef Smash Burger
const items = [
  item("i1", "Chicken Biryani", 450, ["spicy"], "Single plate with raita."),
  item("i2", "Zinger Burger", 550, ["spicy"], "Crispy chicken burger."),
  item("i3", "Raita", 80, [], "Yogurt side."),
  item("i4", "Beef Smash Burger", 750, [], "Melted cheese and beef."),
  item("i5", "Closed Spicy Wings", 400, ["spicy"], "Spicy wings.", false),
];
const say = (text) => [{ role: "user", text }];
const spicy = say("something spicy");
const ids = (out) => out.picks.map((p) => p.item.itemId);
const json = (reply, picks = []) => JSON.stringify({ reply, picks });

function fake(reply) {
  const calls = [];
  const fn = async (system, user) => {
    calls.push({ system, user });
    return typeof reply === "function" ? reply() : reply;
  };
  return { fn, calls };
}

// 1. no model -> rules, real picks
let out = await answerQuestion(spicy, items, null);
assert.equal(out.source, "rules");
assert.equal(out.fallback, "no_model");
assert.deepEqual(ids(out), ["i1", "i2"]);

// 2. the AI chooses the dishes and writes the reply
let m = fake(json("Spice cravings, huh? Start with [[1]].", [{ n: 1, reason: "spicy" }]));
out = await answerQuestion(spicy, items, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.fallback, undefined);
assert.equal(out.reply, "Spice cravings, huh? Start with Chicken Biryani.");
assert.deepEqual(ids(out), ["i1"]);
assert.ok(!m.calls[0].user.includes("i1"), "database ids must not be sent to the AI");
assert.ok(!m.calls[0].user.includes("Closed Spicy Wings"), "closed dishes must not be sent");

// 3. chat with no dishes: the AI IS asked, and may joke
m = fake(json("Hey. I'm a duck, not a mind reader. What are you craving?"));
out = await answerQuestion(say("hi"), items, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.picks.length, 0);
assert.equal(m.calls.length, 1);

// 4. invented or closed dishes are never shown
out = await answerQuestion(spicy, items, fake(json("Try this.", [{ n: 99, reason: "x" }])).fn);
assert.equal(out.fallback, "guard_rejected");
assert.deepEqual(ids(out), ["i1", "i2"], "falls back to rules cards");
out = await answerQuestion(spicy, items, fake(json("Try this.", [{ n: 5, reason: "x" }])).fn);
assert.equal(out.fallback, "guard_rejected", "[5] does not exist: the closed dish is not on the menu");

// 5. a price or an unknown marker in the text is replaced, the valid pick stays
for (const reply of ["Chicken Biryani is only Rs. 450!", "Get [[1]] for 450 rupees.", "Try [[9]]."]) {
  out = await answerQuestion(spicy, items, fake(json(reply, [{ n: 1, reason: "spicy" }])).fn);
  assert.equal(out.source, "ai", reply);
  assert.equal(out.reply, SAFE_REPLY, reply);
  assert.deepEqual(ids(out), ["i1"], reply);
}

// 6. rejected replies fall back to rules
const bad = [
  "Skip that, the Beef Smash Burger is better.", // a dish that is not a pick, in prose
  "[[1]] is halal, enjoy.", // halal claim
  "[[1]] is safe if you have an allergy.", // allergy claim
  "Try [[1]] or maybe [[2]].", // names a dish that has no card
];
for (const reply of bad) {
  out = await answerQuestion(spicy, items, fake(json(reply, [{ n: 1, reason: "spicy" }])).fn);
  assert.equal(out.source, "rules", `should reject: ${reply}`);
  assert.equal(out.fallback, "guard_rejected", `should reject: ${reply}`);
}

// 7. model failure and bad format
out = await answerQuestion(spicy, items, async () => {
  throw new Error("down");
});
assert.equal(out.fallback, "model_error");
out = await answerQuestion(spicy, items, fake("not json at all").fn);
assert.equal(out.fallback, "bad_json");

// 8. allergy / halal / ingredient questions never reach the AI
m = fake(json("Totally halal, trust me."));
out = await answerQuestion(say("is the biryani halal?"), items, m.fn);
assert.equal(out.source, "rules");
assert.equal(out.fallback, "claims_question");
assert.match(out.reply, /ask the restaurant/i);
assert.equal(m.calls.length, 0);

// 9. budget: dishes over budget are not on the menu the AI sees, and cannot be picked
m = fake(json("Go [[1]].", [{ n: 1, reason: "spicy" }, { n: 3, reason: "x" }]));
out = await answerQuestion(say("spicy under 500"), items, m.fn);
assert.deepEqual(ids(out), ["i1"]);
assert.ok(!m.calls[0].user.includes("Zinger Burger"));
assert.ok(!m.calls[0].user.includes("Beef Smash Burger"));

// 10. nothing orderable -> the AI is not called
m = fake(json("hi"));
out = await answerQuestion(spicy, items.map((i) => ({ ...i, canOrderNow: false })), m.fn);
assert.equal(out.fallback, "no_candidates");
assert.equal(m.calls.length, 0);

// 11. name written twice is collapsed
m = fake(json("Try [[1]] Chicken Biryani today.", [{ n: 1, reason: "spicy" }]));
out = await answerQuestion(spicy, items, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.reply, "Try Chicken Biryani today.");

// 12. name plus a shortened copy of the name is collapsed
const karahi = [item("k1", "Chicken Karahi (half)", 1450, ["spicy"], "Tomato and ginger.")];
m = fake(json("Try the spicy Chicken Karahi (half) Chicken Karahi.", [{ n: 1, reason: "spicy" }]));
out = await answerQuestion(spicy, karahi, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.reply, "Try the spicy Chicken Karahi (half).");

console.log("assistant-ai: all checks passed");