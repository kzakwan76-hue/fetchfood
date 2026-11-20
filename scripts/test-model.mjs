import assert from "node:assert/strict";
import { createGeminiCall } from "../lib/assistant/gemini.ts";
import { createModelCall } from "../lib/assistant/model.ts";
import { createOllamaCall } from "../lib/assistant/ollama.ts";

const NAMES = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "OLLAMA_MODEL",
  "OLLAMA_URL",
];
function clear() {
  for (const n of NAMES) delete process.env[n];
}

// --- choosing a provider (no network) ---
clear();
assert.equal(createModelCall(), null, "nothing set -> null");

process.env.GEMINI_API_KEY = "fake-gemini-key";
assert.equal(createModelCall(), null, "gemini key without model -> null");

clear();
process.env.GEMINI_MODEL = "fake-gemini-model";
assert.equal(createModelCall(), null, "gemini model without key -> null");

process.env.GEMINI_API_KEY = "fake-gemini-key";
assert.equal(typeof createModelCall(), "function", "gemini key + model -> function");

clear();
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

// --- the Gemini request and response, with fetch faked ---
const GEMINI_REPLY = '{"reply":"hi","picks":[]}';
globalThis.fetch = async (url, init) => {
  seen = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: "secret thoughts", thought: true }, { text: GEMINI_REPLY }],
          },
        },
      ],
    }),
  };
};

const gemini = createGeminiCall("fake-key", "gemini-test");
assert.equal(await gemini("SYS", "USR", 400), GEMINI_REPLY, "thought parts are skipped");
assert.equal(
  seen.url,
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
);
assert.equal(seen.headers["x-goog-api-key"], "fake-key");
assert.ok(!seen.url.includes("fake-key"), "key must never be in the URL");
assert.deepEqual(seen.body.systemInstruction, { parts: [{ text: "SYS" }] });
assert.deepEqual(seen.body.contents, [{ role: "user", parts: [{ text: "USR" }] }]);
assert.equal(seen.body.generationConfig.responseMimeType, "application/json");
assert.equal(seen.body.generationConfig.maxOutputTokens, 912, "400 + 512 headroom");

globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
await assert.rejects(() => gemini("a", "b", 10), /429/, "rate limit must reject");

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
await assert.rejects(() => gemini("a", "b", 10), "missing text must reject");

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: "" }] } }] }),
});
await assert.rejects(() => gemini("a", "b", 10), "empty text must reject");

// --- Gemini wins when several providers are configured ---
globalThis.fetch = async (url, init) => {
  seen = { url: String(url), body: JSON.parse(init.body) };
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
  };
};
process.env.GEMINI_API_KEY = "fake-gemini-key";
process.env.GEMINI_MODEL = "fake-gemini-model";
process.env.OLLAMA_MODEL = "fake-local-model";
await createModelCall()("S", "U", 100);
assert.ok(
  seen.url.startsWith("https://generativelanguage.googleapis.com/"),
  "gemini is chosen over ollama",
);
clear();

globalThis.fetch = realFetch;

console.log("model: all checks passed");