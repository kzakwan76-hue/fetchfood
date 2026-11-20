import { createGeminiCall } from "../lib/assistant/gemini.ts";

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
console.log("key set:", Boolean(key), "| model:", model);
if (!key || !model) process.exit(1);

try {
  const out = await createGeminiCall(key, model)(
    "Reply with JSON only.",
    'Return {"reply":"hello"}',
    50,
  );
  console.log("OK:", out);
} catch (e) {
  console.log("FAILED:", e instanceof Error ? e.message : e);
  // Ask Google directly for the reason. The reply never contains your key.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
    },
  );
  const body = await res.json().catch(() => ({}));
  console.log("Google says:", res.status, body?.error?.message ?? "(no message)");
}