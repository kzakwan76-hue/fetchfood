import type { AssistantItem, Recommendation } from "./types";

/**
 * The "no invented dishes" guard.
 *
 * The AI never sees real database ids or prices. It sees a numbered list (1, 2, 3...)
 * and answers in JSON: { "reply": "...", "picks": [{ "n": 3, "reason": "..." }] }.
 * This file checks that answer. Anything that is not on the real menu is thrown away,
 * and the cards shown to the customer are built from OUR data, never from the AI's words.
 */

export type ModelPick = { n: number; reason: string };
export type ModelOutput = { reply: string; picks: ModelPick[] };
export type GuardResult = { reply: string; picks: Recommendation[]; notes: string[] };

export const MAX_PICKS = 3;
const MAX_REPLY_CHARS = 600;
const MAX_REASON_CHARS = 160;
export const SAFE_REPLY =
  "Here's what I'd go for. The price and details on each card come straight from the menu.";
const GENERIC_REASON = "Matches what you asked for.";

const PLACEHOLDER = /\[\[(\d{1,3})\]\]/g;
// Currency amounts the AI is not allowed to state. Prices appear only on the cards.
const MONEY = /(?:\b(?:rs|pkr)\.?|₨)\s*\d|\d\s*(?:rs\b|rupees?|pkr\b)/i;

/** Pulls the JSON object out of the model's text (it may add code fences or chatter). */
export function parseModelOutput(raw: string): ModelOutput | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const object = data as Record<string, unknown>;
  if (typeof object.reply !== "string") return null;

  const picks: ModelPick[] = [];
  if (Array.isArray(object.picks)) {
    for (const entry of object.picks) {
      if (typeof entry !== "object" || entry === null) continue;
      const { n, reason } = entry as Record<string, unknown>;
      if (typeof n === "number" && Number.isInteger(n) && typeof reason === "string") {
        picks.push({ n, reason });
      }
    }
  }
  return { reply: object.reply, picks };
}

/**
 * Turns [[3]] markers into the real dish name. Returns null if the text names an
 * unknown dish, states a price, or mentions a number that looks like an invented price.
 */
function renderText(
  text: string,
  items: AssistantItem[],
  budget: number | null,
  maxChars: number,
): string | null {
  const withoutMarkers = text.replace(PLACEHOLDER, " ");
  if (MONEY.test(withoutMarkers)) return null;
  for (const match of withoutMarkers.matchAll(/\b\d{3,}\b/g)) {
    // The customer's own budget may be repeated back. Any other big number may be an invented price.
    if (budget === null || Number(match[0]) !== budget) return null;
  }

  let unknownDish = false;
  const replaced = text.replace(PLACEHOLDER, (_marker, digits: string) => {
    const item = items[Number(digits) - 1];
    if (!item) {
      unknownDish = true;
      return "";
    }
    return item.name;
  });
  if (unknownDish) return null;

  const clean = replaced.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > maxChars ? `${clean.slice(0, maxChars - 1).trimEnd()}…` : clean;
}

/**
 * `items` MUST be the same array, in the same order, that was numbered in the prompt.
 * Returns null when nothing usable is left, so the caller falls back to the rule-based assistant.
 */
export function applyGuard(
  output: ModelOutput,
  items: AssistantItem[],
  budget: number | null,
): GuardResult | null {
  const notes: string[] = [];
  const picks: Recommendation[] = [];
  const seen = new Set<number>();

  for (const pick of output.picks) {
    const item = pick.n >= 1 ? items[pick.n - 1] : undefined;
    if (!item) {
      notes.push(`dropped pick ${pick.n}: no such menu item`);
    } else if (seen.has(pick.n)) {
      notes.push(`dropped pick ${pick.n}: duplicate`);
    } else if (!item.canOrderNow) {
      notes.push(`dropped pick ${pick.n}: not orderable right now`);
    } else if (budget !== null && item.pricePkr > budget) {
      notes.push(`dropped pick ${pick.n}: over budget`);
    } else if (picks.length >= MAX_PICKS) {
      notes.push(`dropped pick ${pick.n}: more than ${MAX_PICKS} picks`);
    } else {
      seen.add(pick.n);
      picks.push({
        item,
        reason: renderText(pick.reason, items, budget, MAX_REASON_CHARS) ?? GENERIC_REASON,
      });
    }
  }

  // The AI suggested dishes but none of them are real or allowed: do not trust this answer at all.
  if (output.picks.length > 0 && picks.length === 0) return null;

  const reply = renderText(output.reply, items, budget, MAX_REPLY_CHARS);
  if (reply === null) notes.push("reply replaced: it named an unknown dish or stated a price");
  if (picks.length === 0 && reply === null) return null;
  return { reply: reply ?? SAFE_REPLY, picks, notes };
}