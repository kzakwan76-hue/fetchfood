import { parseBudget } from "./recommend";

/**
 * Everything the browser sends is untrusted. This file validates and cleans it.
 * Assistant turns sent by the browser are untrusted too: a customer could forge them.
 */

export type Turn = { role: "user" | "assistant"; text: string };

export const MAX_TURNS = 8;
export const MAX_TEXT_CHARS = 300;
const MAX_MESSAGES_ACCEPTED = 50;

/** One line of plain text: no line breaks, no control characters, no angle brackets, no [[ ]] markers. */
export function cleanText(value: string, max: number = MAX_TEXT_CHARS): string {
  const oneLine = value.replace(/\s+/g, " ");
  const printable = Array.from(oneLine)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join("");
  return printable
    .replace(/</g, "‹")
    .replace(/>/g, "›")
    .replace(/\[\[|\]\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Checks the request body. Returns the most recent turns, or null if the body is not valid. */
export function parseTurns(body: unknown): Turn[] | null {
  if (typeof body !== "object" || body === null) return null;
  const messages = (body as Record<string, unknown>).messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES_ACCEPTED) {
    return null;
  }

  const turns: Turn[] = [];
  for (const entry of messages) {
    if (typeof entry !== "object" || entry === null) return null;
    const { role, text } = entry as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") return null;
    const clean = cleanText(text);
    if (clean) turns.push({ role, text: clean });
  }

  const recent = turns.slice(-MAX_TURNS);
  const last = recent[recent.length - 1];
  if (!last || last.role !== "user") return null; // the customer must have the last word
  return recent;
}

/** The newest budget the customer mentioned, so "make it Rs. 500" overrides an earlier "under 800". */
export function latestBudget(turns: Turn[]): number | null {
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index];
    if (turn.role !== "user") continue;
    const budget = parseBudget(turn.text);
    if (budget !== null) return budget;
  }
  return null;
}

/** What the customer said recently (their words only), used to find relevant dishes. */
export function customerText(turns: Turn[]): string {
  return turns
    .filter((turn) => turn.role === "user")
    .slice(-3)
    .map((turn) => turn.text)
    .join(". ");
}