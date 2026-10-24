   import { NextResponse } from "next/server";
   import { getAllRestaurantsWithMenus } from "../../../lib/catalog";
   import { answerQuestion } from "../../../lib/assistant/answer";
   import { toAssistantItems, toPublicAnswer } from "../../../lib/assistant/convert";
   import { parseTurns } from "../../../lib/assistant/conversation";
   import { createModelCall } from "../../../lib/assistant/model";
   import { checkAiAllowance, getClientIp } from "../../../lib/assistant/ratelimit";

   const MAX_BODY_CHARS = 8000;

   function reply(body: unknown, status = 200) {
     return NextResponse.json(body, {
       status,
       headers: { "Cache-Control": "no-store" },
     });
   }

   export async function POST(request: Request) {
     const text = await request.text();
     if (text.length > MAX_BODY_CHARS) {
       return reply({ error: "Message too long" }, 413);
     }

     let body: unknown;
     try {
       body = JSON.parse(text);
     } catch {
       return reply({ error: "Invalid JSON" }, 400);
     }

     const turns = parseTurns(body);
     if (!turns) return reply({ error: "Invalid conversation" }, 400);

     let items;
     try {
       items = toAssistantItems(await getAllRestaurantsWithMenus());
     } catch {
       return reply({ error: "Menu unavailable" }, 503);
     }

     // No key/model configured -> null -> rules. Only count usage when AI is possible.
     let callModel = createModelCall();
     let limited: string | null = null;
     if (callModel) {
       const allowance = checkAiAllowance(getClientIp(request.headers));
       if (!allowance.allowed) {
         callModel = null;
         limited = allowance.reason;
       }
     }

     const outcome = await answerQuestion(turns, items, callModel);

     // Log counts and reasons only. Never customer text, never keys.
     console.log(
       JSON.stringify({
         assistant: {
           source: outcome.source,
           fallback: outcome.fallback ?? null,
           limited,
           turns: turns.length,
           items: items.length,
           picks: outcome.picks.length,
         },
       }),
     );

     return reply(toPublicAnswer(outcome));
   }