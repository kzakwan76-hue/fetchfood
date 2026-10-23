import { customerText, latestBudget } from "./conversation";
import type { Turn } from "./conversation";
import { applyGuard, parseModelOutput } from "./guard";
import { buildUserPrompt, selectCandidates, SYSTEM_PROMPT } from "./prompt";
import { recommendByRules } from "./recommend";
import type { AssistantAnswer, AssistantItem } from "./types";

/** Anything that can turn (system prompt, user prompt) into reply text. null = no AI available. */
export type ModelCall = (system: string, user: string, maxTokens: number) => Promise<string>;

export const MAX_ANSWER_TOKENS = 400;

export type FallbackReason =
  | "no_model" // no key, or the AI limit was reached
  | "no_candidates" // nothing orderable fits, so there is nothing to ask the AI
  | "model_error" // the AI call failed or timed out
  | "bad_json" // the AI did not answer in the expected format
  | "guard_rejected"; // every suggestion was invented, closed or over budget

export type AnswerOutcome = AssistantAnswer & {
  fallback?: FallbackReason; // set when the rule-based assistant answered instead of the AI
  notes: string[]; // what the guard dropped (safe to log: contains no customer text)
};

/**
 * The whole decision, in order:
 *   no AI or nothing to recommend -> rules
 *   AI fails or answers badly      -> rules
 *   AI answers                     -> guard -> real, orderable, in-budget dishes only
 */
export async function answerQuestion(
  turns: Turn[],
  items: AssistantItem[],
  callModel: ModelCall | null,
): Promise<AnswerOutcome> {
  const words = customerText(turns);
  const budget = latestBudget(turns);
  const fallbackToRules = (fallback: FallbackReason, notes: string[] = []): AnswerOutcome => ({
    ...recommendByRules(words, items, budget),
    fallback,
    notes,
  });

  const candidates = selectCandidates(words, items, budget);
  if (candidates.length === 0) return fallbackToRules("no_candidates");
  if (!callModel) return fallbackToRules("no_model");

  let raw: string;
  try {
    raw = await callModel(SYSTEM_PROMPT, buildUserPrompt(turns, candidates), MAX_ANSWER_TOKENS);
  } catch {
    return fallbackToRules("model_error");
  }

  const parsed = parseModelOutput(raw);
  if (!parsed) return fallbackToRules("bad_json");

  const guarded = applyGuard(parsed, candidates, budget);
  if (!guarded) return fallbackToRules("guard_rejected");

  return { source: "ai", reply: guarded.reply, picks: guarded.picks, notes: guarded.notes };
}