import type { ModelCall } from "./answer";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const ATTEMPT_TIMEOUT_MS = 10_000; // one request
const DEADLINE_MS = 12_000; // all attempts together
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 700; // doubles on each retry: 0.7s, then 1.4s
// Gemini 3 may spend a few output tokens on thinking, so leave room for it.
const HEADROOM_TOKENS = 512;

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: unknown; thought?: unknown }[] };
  }[];
};

// Overloaded (503), rate limited (429), timed out (408) and other server errors
// are worth retrying. Client errors such as 400 or 403 are not.
function isTransient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Talks to the Gemini API. The key goes in a header, never in the URL, and
// errors only mention the status code so the key cannot end up in logs.
export function createGeminiCall(
  apiKey: string,
  model: string,
  retryDelayMs: number = RETRY_DELAY_MS,
): ModelCall {
  const url = `${BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;

  return async (system, user, maxTokens) => {
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens + HEADROOM_TOKENS,
        responseMimeType: "application/json",
      },
    });
    const started = Date.now();

    for (let attempt = 1; ; attempt += 1) {
      const remaining = DEADLINE_MS - (Date.now() - started);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body,
        signal: AbortSignal.timeout(Math.max(1000, Math.min(ATTEMPT_TIMEOUT_MS, remaining))),
      });

      if (res.ok) {
        const data = (await res.json()) as GeminiResponse;
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const text = parts
          .map((p) => (typeof p.text === "string" && p.thought !== true ? p.text : ""))
          .join("");
        if (!text) throw new Error("Gemini sent no text");
        return text;
      }

      const wait = retryDelayMs * 2 ** (attempt - 1);
      const timeLeft = DEADLINE_MS - (Date.now() - started) - wait;
      if (attempt >= MAX_ATTEMPTS || !isTransient(res.status) || timeLeft < 2000) {
        throw new Error(`Gemini returned ${res.status}`);
      }
      await sleep(wait);
    }
  };
}