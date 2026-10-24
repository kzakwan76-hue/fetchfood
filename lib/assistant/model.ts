   import Anthropic from "@anthropic-ai/sdk";
   import type { ModelCall } from "./answer";

   // Returns null when the key or model is missing, so the app falls back to rules.
   export function createModelCall(): ModelCall | null {
     const apiKey = process.env.ANTHROPIC_API_KEY;
     const model = process.env.ANTHROPIC_MODEL;
     if (!apiKey || !model) return null;

     const client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });

     return async (system, user, maxTokens) => {
       const message = await client.messages.create({
         model,
         max_tokens: maxTokens,
         system,
         messages: [{ role: "user", content: user }],
       });
       return message.content
         .map((block) => (block.type === "text" ? block.text : ""))
         .join("");
     };
   }