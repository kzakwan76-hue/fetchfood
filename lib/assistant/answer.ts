import { customerText, latestBudget } from "./conversation";
import type { Turn } from "./conversation";
import { applyGuard, applyReplyGuard, parseModelOutput } from "./guard";
import { buildUserPrompt, selectCandidates, SYSTEM_PROMPT } from "./prompt";
import { recommendByRules } from "./recommend";
import type { AssistantAnswer, AssistantItem } from "./types";

/** Anything that can turn (system prompt, user prompt) into reply text. null = no AI available. */
export type ModelCall = (system: string, user: string, maxTokens: number) => Promise<string>;

export const MAX_ANSWER_TOKENS = 400;
export const MAX_REPLY_TOKENS = 120;

export type FallbackReason =
  | "no_model" // no key, or the AI limit was reached
  | "no_candidates" // nothing is orderable right now (closed, sold out or over budget)
  | "model_error" // the AI call failed or timed out
  | "bad_json" // the AI did not answer in the expected format
  | "guard_rejected" // the AI's answer broke a rule (price, allergy claim, stray dish name, invented dish)
  | "claims_question"; // the customer asked about allergies, halal or ingredients: fixed answer, no AI

export type AnswerOutcome = AssistantAnswer & {
  fallback?: FallbackReason; // set when the plain rules text was used instead of the AI answer
  notes: string[]; // safe to log: contains no customer text
};

// Questions we have no data for. The answer is fixed on purpose: no joke, no guessing.
const CLAIMS_QUESTION = /\b(halal|haram|allerg\w*|gluten|lactose|dairy|vegan|nuts?|peanuts?|ingredients?)\b/i;
const CLAIMS_REPLY =
  "I don't have allergy, ingredient or halal information, so I can't confirm any of that. Please ask the restaurant directly before you order.";
// When the AI itself fails, say so in character instead of showing the rules-only sentence.
const AI_FAILED = new Set<FallbackReason>(["model_error", "bad_json", "guard_rejected"]);
const GLITCH_WITH_PICKS =
  "My duck brain lagged for a second, so here's my simple matching. Still real dishes from menus that are open:";
const GLITCH_NO_PICKS = "My duck brain lagged for a second. Say that again?";

// Development only: shows in the `npm run dev` terminal, never in production logs.
function debug(label: string, detail: string): void {
  if (process.env.NODE_ENV === "development") console.log(`[moka-debug] ${label}: ${detail}`);
}

/**
 * M23b. The AI goes first: it sees the open menu, chats, and chooses dishes by number.
 * Code checks everything it says, and the cards are built from our data, never from its words.
 *   asks about halal/allergies/ingredients -> fixed answer (no AI)
 *   no AI, or nothing orderable            -> rules text
 *   AI fails or its answer is rejected     -> rules text
 *   otherwise                              -> AI reply + the dishes it chose (all checked)
 */
export async function answerQuestion(
  turns: Turn[],
  items: AssistantItem[],
  callModel: ModelCall | null,
): Promise<AnswerOutcome> {
  const words = customerText(turns);
  const budget = latestBudget(turns);
  const byRules = recommendByRules(words, items, budget);
    const fallbackToRules = (fallback: FallbackReason, notes: string[] = []): AnswerOutcome => ({
    ...byRules,
    reply: AI_FAILED.has(fallback)
      ? byRules.picks.length > 0
        ? GLITCH_WITH_PICKS
        : GLITCH_NO_PICKS
      : byRules.reply,
    fallback,
    notes,
  });

  const lastUserText = [...turns].reverse().find((turn) => turn.role === "user")?.text ?? "";
  if (CLAIMS_QUESTION.test(lastUserText)) {
    return { ...byRules, reply: CLAIMS_REPLY, fallback: "claims_question", notes: [] };
  }

  if (!callModel) return fallbackToRules("no_model");

  const candidates = selectCandidates(words, items, budget);
  if (candidates.length === 0) return fallbackToRules("no_candidates");

  let raw: string;
  try {
    raw = await callModel(SYSTEM_PROMPT, buildUserPrompt(turns, candidates), MAX_ANSWER_TOKENS);
  } catch (error) {
    // Our own error messages only contain a status code, never a key or customer text.
    const why = error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
    debug("model_error", why);
    return fallbackToRules("model_error", [why]);
  }

  const parsed = parseModelOutput(raw);
  if (!parsed) {
    debug("bad_json", raw.slice(0, 400));
    return fallbackToRules("bad_json");
  }

  // 1. Real, open, in-budget dishes only; prices and unknown dishes in the text are removed.
  const guarded = applyGuard(parsed, candidates, budget);
  if (!guarded) {
    debug("guard_rejected (picks)", raw.slice(0, 400));
    return fallbackToRules("guard_rejected", ["answer rejected by the guard"]);
  }

  // 2. The sentence itself: no allergy/halal claims, no dish named that is not a pick.
  const picked = guarded.picks.map((pick) => pick.item);
  const reply = applyReplyGuard(guarded.reply, picked, items, budget);
  if (reply === null) {
    debug("guard_rejected (reply)", `${guarded.reply} | picks: ${picked.map((p) => p.name).join(", ")}`);
    return fallbackToRules("guard_rejected", ["reply rejected by the reply guard"]);
  }

  return { source: "ai", reply, picks: guarded.picks, notes: guarded.notes };
}