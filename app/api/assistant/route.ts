import { NextResponse } from "next/server";
import { getAllRestaurantsWithMenus } from "../../../lib/catalog";
import type { RestaurantWithMenu } from "../../../lib/catalog";
import { answerQuestion } from "../../../lib/assistant/answer";
import { toAssistantItems, toPublicAnswer } from "../../../lib/assistant/convert";
import { parseTurns } from "../../../lib/assistant/conversation";
import { createModelCall } from "../../../lib/assistant/model";
import { checkAiAllowance, getClientIp } from "../../../lib/assistant/ratelimit";

const MAX_BODY_CHARS = 8000;
const UUID = /^[0-9a-f-]{36}$/i;

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

  // The website always sends the customer's area. Dev scripts may omit it (all areas then).
  // The real guarantee is place_order, which refuses restaurants outside the chosen area.
  const rawZone =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).zoneId : undefined;
  if (rawZone !== undefined && (typeof rawZone !== "string" || !UUID.test(rawZone))) {
    return reply({ error: "Invalid area" }, 400);
  }

  let all: RestaurantWithMenu[];
  try {
    all = await getAllRestaurantsWithMenus();
  } catch {
    return reply({ error: "Menu unavailable" }, 503);
  }
  const restaurants = rawZone === undefined ? all : all.filter((r) => r.zoneId === rawZone);
  if (restaurants.length === 0) {
    return reply({
      source: "rules",
      reply: "We don't have restaurants in this area yet. Try another area.",
      picks: [],
    });
  }
  const items = toAssistantItems(restaurants);

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

  // The cart needs each restaurant's fee and minimum (display only; the
  // database recalculates everything when the order is placed).
  const answer = toPublicAnswer(outcome);
  const byId = new Map(restaurants.map((r) => [r.id, r] as const));
  const picks = answer.picks.flatMap((pick) => {
    const r = byId.get(pick.restaurantId);
    return r ? [{ ...pick, deliveryFeePkr: r.deliveryFeePkr, minOrderPkr: r.minOrderPkr }] : [];
  });

  return reply({ ...answer, picks });
}