   import assert from "node:assert/strict";
   import { createModelCall } from "../lib/assistant/model.ts";
   import { createOllamaCall } from "../lib/assistant/ollama.ts";

   const NAMES = ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "OLLAMA_MODEL", "OLLAMA_URL"];
   function clear() {
     for (const n of NAMES) delete process.env[n];
   }

   // --- choosing a provider (no network) ---
   clear();
   assert.equal(createModelCall(), null, "nothing set -> null");

   process.env.ANTHROPIC_API_KEY = "fake-key-for-test";
   assert.equal(createModelCall(), null, "key without model -> null");

   clear();
   process.env.ANTHROPIC_MODEL = "fake-model-for-test";
   assert.equal(createModelCall(), null, "model without key -> null");

   process.env.ANTHROPIC_API_KEY = "fake-key-for-test";
   assert.equal(typeof createModelCall(), "function", "key + model -> function");

   clear();
   process.env.OLLAMA_MODEL = "fake-local-model";
   assert.equal(typeof createModelCall(), "function", "ollama model -> function");
   clear();

   // --- the Ollama request and response, with fetch faked ---
   const realFetch = globalThis.fetch;
   let seen;
   globalThis.fetch = async (url, init) => {
     seen = { url: String(url), body: JSON.parse(init.body) };
     return {
       ok: true,
       status: 200,
       json: async () => ({ message: { content: '{"reply":"hi","picks":[]}' } }),
     };
   };

   const call = createOllamaCall("test-model", "http://example.test:1234/");
   const out = await call("SYS", "USR", 400);
   assert.equal(out, '{"reply":"hi","picks":[]}');
   assert.equal(seen.url, "http://example.test:1234/api/chat");
   assert.equal(seen.body.model, "test-model");
   assert.equal(seen.body.stream, false);
   assert.equal(seen.body.format, "json");
   assert.equal(seen.body.options.num_predict, 400);
   assert.deepEqual(seen.body.messages[0], { role: "system", content: "SYS" });
   assert.deepEqual(seen.body.messages[1], { role: "user", content: "USR" });

   globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
   await assert.rejects(() => call("a", "b", 10), "HTTP error must reject");

   globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
   await assert.rejects(() => call("a", "b", 10), "missing text must reject");

   globalThis.fetch = realFetch;

   console.log("model: all checks passed");