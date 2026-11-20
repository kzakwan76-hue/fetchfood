import type { ModelCall } from "./answer";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 20_000;
// Gemini 3 may spend a few output tokens on thinking, so leave room for it.
const HEADROOM_TOKENS = 512;

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: unknown; thought?: unknown }[] };
  }[];
};

// Talks to the Gemini API. The key goes in a header, never in the URL, and
// errors only mention the status code so the key cannot end up in logs.
export function createGeminiCall(apiKey: string, model: string): ModelCall {
  const url = `${BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;

  return async (system, user, maxTokens) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: maxTokens + HEADROOM_TOKENS,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Gemini returned ${res.status}`);

    const data = (await res.json()) as GeminiResponse;
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => (typeof p.text === "string" && p.thought !== true ? p.text : ""))
      .join("");
    if (!text) throw new Error("Gemini sent no text");
    return text;
  };
}