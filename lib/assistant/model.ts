   import Anthropic from "@anthropic-ai/sdk";
   import type { ModelCall } from "./answer";
   import { createOllamaCall } from "./ollama";

   function createAnthropicCall(apiKey: string, model: string): ModelCall {
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

   // Anthropic if a key + model are set, else local Ollama if OLLAMA_MODEL is set,
   // else null (the app answers with rules).
   export function createModelCall(): ModelCall | null {
     const apiKey = process.env.ANTHROPIC_API_KEY;
     const anthropicModel = process.env.ANTHROPIC_MODEL;
     if (apiKey && anthropicModel) return createAnthropicCall(apiKey, anthropicModel);

     const ollamaModel = process.env.OLLAMA_MODEL;
     if (ollamaModel) {
       return createOllamaCall(ollamaModel, process.env.OLLAMA_URL || undefined);
     }

     return null;
   }