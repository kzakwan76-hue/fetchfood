   import type { ModelCall } from "./answer";

   const DEFAULT_URL = "http://127.0.0.1:11434";
   const TIMEOUT_MS = 60_000;

   // Talks to a local Ollama server. No key needed.
   export function createOllamaCall(
     model: string,
     baseUrl: string = DEFAULT_URL,
   ): ModelCall {
     const url = `${baseUrl.replace(/\/+$/, "")}/api/chat`;

     return async (system, user, maxTokens) => {
       const res = await fetch(url, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           model,
           stream: false,
           format: "json",
           options: { num_predict: maxTokens, temperature: 0.7 },
           messages: [
             { role: "system", content: system },
             { role: "user", content: user },
           ],
         }),
         signal: AbortSignal.timeout(TIMEOUT_MS),
       });
       if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

       const data = (await res.json()) as { message?: { content?: unknown } };
       const text = data.message?.content;
       if (typeof text !== "string") throw new Error("Ollama sent no text");
       return text;
     };
   }