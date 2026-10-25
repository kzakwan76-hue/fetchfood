import assert from "node:assert/strict";
import { answerQuestion } from "../lib/assistant/answer.ts";

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

const items = [
  item("i1", "Chicken Biryani", 450, ["spicy"], "Single plate with raita."),
  item("i2", "Zinger Burger", 550, ["spicy"], "Crispy chicken burger."),
  item("i3", "Raita", 80, [], "Yogurt side."),
  item("i4", "Beef Smash Burger", 750, [], "Melted cheese and beef."),
  item("i5", "Closed Spicy Wings", 400, ["spicy"], "Spicy wings.", false),
];
const spicy = [{ role: "user", text: "something spicy" }];

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
assert.deepEqual(out.picks.map((p) => p.item.itemId), ["i1", "i2"]);

// 2. good sentence -> source ai, cards come from the rules
let m = fake(JSON.stringify({ reply: "Spice cravings, huh? Start with [[1]]." }));
out = await answerQuestion(spicy, items, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.fallback, undefined);
assert.equal(out.reply, "Spice cravings, huh? Start with Chicken Biryani.");
assert.deepEqual(out.picks.map((p) => p.item.itemId), ["i1", "i2"]);
assert.ok(!m.calls[0].user.includes("Rs."), "prices must not be sent to the AI");
assert.ok(!m.calls[0].user.includes("i1"), "ids must not be sent to the AI");
assert.ok(!m.calls[0].user.includes("Closed Spicy Wings"));

// 3. the AI cannot change the cards, even if it tries
m = fake(JSON.stringify({ reply: "Nice.", picks: [{ n: 3, reason: "x" }] }));
out = await answerQuestion(spicy, items, m.fn);
assert.deepEqual(out.picks.map((p) => p.item.itemId), ["i1", "i2"]);

// 4. doubled name is collapsed
m = fake(JSON.stringify({ reply: "Try [[1]] Chicken Biryani today." }));
out = await answerQuestion(spicy, items, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.reply, "Try Chicken Biryani today.");

// 5. rejected sentences fall back to rules
const bad = [
  "Chicken Biryani is only Rs. 450!", // price
  "Get [[1]] for 450 rupees.", // price
  "Skip that, the Beef Smash Burger is better.", // dish that is not a pick, in prose
  "[[1]] is halal, enjoy.", // halal claim
  "[[1]] is safe if you have an allergy.", // allergy claim
  "Try [[9]].", // unknown marker
  "",
];
for (const reply of bad) {
  out = await answerQuestion(spicy, items, fake(JSON.stringify({ reply })).fn);
  assert.equal(out.source, "rules", `should reject: ${reply}`);
  assert.equal(out.fallback, "guard_rejected", `should reject: ${reply}`);
  assert.deepEqual(out.picks.map((p) => p.item.itemId), ["i1", "i2"]);
}

// 6. model failure and bad format
out = await answerQuestion(spicy, items, async () => {
  throw new Error("down");
});
assert.equal(out.fallback, "model_error");
out = await answerQuestion(spicy, items, fake("not json at all").fn);
assert.equal(out.fallback, "bad_json");

// 7. nothing matches -> the AI is never called
m = fake(JSON.stringify({ reply: "hi" }));
out = await answerQuestion([{ role: "user", text: "sushi" }], items, m.fn);
assert.equal(out.fallback, "no_candidates");
assert.equal(out.picks.length, 0);
assert.equal(m.calls.length, 0);

// 8. budget is respected by the cards
out = await answerQuestion([{ role: "user", text: "spicy under 500" }], items, fake(JSON.stringify({ reply: "Go [[1]]." })).fn);
assert.deepEqual(out.picks.map((p) => p.item.itemId), ["i1"]);

// 9. name plus a shortened copy of the name is collapsed
const karahi = [item("k1", "Chicken Karahi (half)", 1450, ["spicy"], "Tomato and ginger.")];
m = fake(JSON.stringify({ reply: "Try the spicy Chicken Karahi (half) Chicken Karahi." }));
out = await answerQuestion(spicy, karahi, m.fn);
assert.equal(out.source, "ai");
assert.equal(out.reply, "Try the spicy Chicken Karahi (half).");

console.log("assistant-ai: all checks passed");