   import assert from "node:assert/strict";

   const BASE = process.env.ASSISTANT_TEST_URL ?? "http://localhost:3000";
   const URL_ = `${BASE}/api/assistant`;
   const aiConfigured = Boolean(
     (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) ||
       process.env.OLLAMA_MODEL,
   );

   async function post(raw) {
     const res = await fetch(URL_, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: raw,
     });
     let json = null;
     try {
       json = await res.json();
     } catch {}
     return { status: res.status, json };
   }

   const ask = (text) =>
     JSON.stringify({ messages: [{ role: "user", text }] });

   // 1. a normal question gets a usable answer
   const ok = await post(ask("something spicy under 800 rupees"));
   assert.equal(ok.status, 200, "normal question should be 200");
   assert.equal(typeof ok.json.reply, "string");
   assert.ok(Array.isArray(ok.json.picks));
   for (const p of ok.json.picks) {
     assert.equal(typeof p.itemId, "string");
     assert.equal(typeof p.restaurantSlug, "string");
     assert.ok(Number.isInteger(p.pricePkr), "price must be a whole rupee integer");
     assert.ok(Number.isInteger(p.deliveryFeePkr), "fee must be a whole rupee integer");
     assert.ok(Number.isInteger(p.minOrderPkr), "minimum must be a whole rupee integer"); 
   }
   if (!aiConfigured) {
     assert.notEqual(ok.json.source, "ai", "no key set, so it must not claim AI");
   }
   console.log(`source=${ok.json.source} picks=${ok.json.picks.length}`);
   for (const p of ok.json.picks) {
     console.log(`  - ${p.name} (${p.restaurantName}) Rs. ${p.pricePkr}`);
   }

   // 2. bad inputs are refused, not crashed on
   assert.equal((await post("{not json")).status, 400, "bad JSON");
   assert.equal((await post(JSON.stringify({ messages: "hi" }))).status, 400, "wrong shape");
   assert.equal(
     (await post(JSON.stringify({ messages: [{ role: "assistant", text: "hi" }] }))).status,
     400,
     "assistant must not speak last",
   );
   assert.equal((await post("x".repeat(9000))).status, 413, "too long");

   console.log("route: all checks passed");