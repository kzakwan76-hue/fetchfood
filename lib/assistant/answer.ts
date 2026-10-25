import { customerText, latestBudget } from "./conversation";
import type { Turn } from "./conversation";
import { applyReplyGuard, parseModelOutput } from "./guard";
import { buildSassPrompt, SASS_SYSTEM_PROMPT } from "./prompt";
import { recommendByRules } from "./recommend";
import type { AssistantAnswer, AssistantItem } from "./types";

/** Anything that can turn (system prompt, user prompt) into reply text. null = no AI available. */
export type ModelCall = (system: string, user: string, maxTokens: number) => Promise<string>;

export const MAX_ANSWER_TOKENS = 400;
export const MAX_REPLY_TOKENS = 120;

export type FallbackReason =
  | "no_model" // no key, or the AI limit was reached
  | "no_candidates" // the rules found nothing to recommend, so the AI is not asked
  | "model_error" // the AI call failed or timed out
  | "bad_json" // the AI did not answer in the expected format
  | "guard_rejected"; // the AI's sentence broke a rule (price, allergy claim, stray dish name)

export type AnswerOutcome = AssistantAnswer & {
  fallback?: FallbackReason; // set when the plain rules text was used instead of the AI sentence
  notes: string[]; // safe to log: contains no customer text
};

/**
 * M6e. Code chooses the dishes (keyword rules), so the cards are true by construction.
 * The AI only writes one short sentence about them, and that sentence is guarded.
 *   rules find nothing  -> rules text (no AI cost)
 *   no AI               -> rules text
 *   AI fails or its sentence is rejected -> rules text
 *   otherwise           -> AI sentence + the rules' cards
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
    fallback,
    notes,
  });

  if (byRules.picks.length === 0) return fallbackToRules("no_candidates");
  if (!callModel) return fallbackToRules("no_model");

  const dishes = byRules.picks.map((pick) => pick.item);
  let raw: string;
  try {
    raw = await callModel(SASS_SYSTEM_PROMPT, buildSassPrompt(turns, dishes), MAX_REPLY_TOKENS);
  } catch {
    return fallbackToRules("model_error");
  }

  const parsed = parseModelOutput(raw);
  if (!parsed) return fallbackToRules("bad_json");

  const reply = applyReplyGuard(parsed.reply, dishes, items, budget);
  if (reply === null) return fallbackToRules("guard_rejected", ["reply rejected by the guard"]);

  return { source: "ai", reply, picks: byRules.picks, notes: [] };
}