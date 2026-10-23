import type { AssistantAnswer, AssistantItem, Recommendation } from "./types";

/**
 * The rule-based assistant. It is the fallback when the AI is down or has no key,
 * and it also works with no internet and no cost. It can only choose items that exist.
 */

const MIN_BUDGET = 50;
const MAX_BUDGET = 50_000;
const MAX_PICKS = 3;

/** Finds a budget in rupees in free text, or returns null. */
export function parseBudget(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, "");
  // A number followed by a time, distance or head-count is not a budget ("within 30 minutes").
  const notUnit = "(?!\\s*(?:min|mins|minutes?|hours?|hrs?|km|people|persons?|ppl|members?))";
  const patterns = [
    new RegExp(`(?:\\b(?:rs|pkr)\\.?|₨)\\s*(\\d{2,5})${notUnit}`),
    new RegExp(`(\\d{2,5})\\s*(?:rs\\b|rupees?|pkr\\b)`),
    new RegExp(
      `(?:under|below|within|upto|up to|max|maximum|less than|budget(?: of| is)?)\\s*(\\d{2,5})${notUnit}`,
    ),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(t);
    if (match) {
      const value = Number(match[1]);
      if (value >= MIN_BUDGET && value <= MAX_BUDGET) return value;
    }
  }
  return null;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "want", "wanna", "need", "something", "anything", "some",
  "that", "this", "have", "can", "you", "please", "give", "show", "food", "eat", "eating",
  "craving", "cravings", "hungry", "feel", "like", "really", "very", "just", "also", "not",
  "too", "but", "are", "what", "whats", "tonight", "today", "now", "under", "below",
  "within", "budget", "rupees", "rupee", "pkr", "less", "than", "upto", "max", "maximum",
  "about", "around", "good", "best", "nice", "got", "get", "would", "could", "should",
]);

// Small on purpose: words people say that differ from how menus are written.
const SYNONYMS: Record<string, string[]> = {
  cheesy: ["cheese", "cheesy"],
  veg: ["vegetarian"],
  veggie: ["vegetarian"],
  hot: ["spicy"],
  sweet: ["sweet", "dessert"],
  dessert: ["dessert", "sweet"],
};

/** The food words in a sentence, with filler removed and synonyms added. */
export function extractTerms(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  const terms = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    for (const term of SYNONYMS[word] ?? [word]) terms.add(term);
  }
  return [...terms];
}

function matchesWordStart(haystack: string, term: string): boolean {
  // term only contains a-z, so it is safe inside a regex. "burger" matches "burgers".
  return new RegExp(`\\b${term}`).test(haystack);
}

export function recommendByRules(question: string, items: AssistantItem[]): AssistantAnswer {
  const budget = parseBudget(question);
  const terms = extractTerms(question);
  const orderable = items.filter(
    (item) => item.canOrderNow && (budget === null || item.pricePkr <= budget),
  );
  const rules = (reply: string, picks: Recommendation[] = []): AssistantAnswer => ({
    source: "rules",
    reply,
    picks,
  });

  if (terms.length === 0 && budget === null) {
    return rules(
      "Hungry but no idea what for? Bold strategy. Tell me a craving (spicy, cheesy, vegetarian, burger...) or a budget, and I'll find something real.",
    );
  }
  if (orderable.length === 0) {
    return rules(
      budget === null
        ? "Nothing is orderable right now. Every restaurant is closed or sold out."
        : "Nothing that's open right now fits under that budget. Try a slightly higher one.",
    );
  }

  let ranked: { item: AssistantItem; score: number; matched: string[] }[];
  if (terms.length === 0) {
    // Budget only: show the best use of the money, most expensive first.
    ranked = orderable
      .map((item) => ({ item, score: 1, matched: [] as string[] }))
      .sort((a, b) => b.item.pricePkr - a.item.pricePkr || a.item.name.localeCompare(b.item.name));
  } else {
    ranked = orderable
      .map((item) => {
        const name = item.name.toLowerCase();
        const all = `${name} ${item.description} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
        const matched: string[] = [];
        let score = 0;
        for (const term of terms) {
          if (matchesWordStart(name, term)) {
            score += 3;
            matched.push(term);
          } else if (matchesWordStart(all, term)) {
            score += 2;
            matched.push(term);
          }
        }
        return { item, score, matched };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.pricePkr - b.item.pricePkr);
  }

  const picks = ranked.slice(0, MAX_PICKS).map(({ item, matched }) => ({
    item,
    reason: matched.length > 0 ? `Matches: ${matched.join(", ")}.` : "Fits your budget.",
  }));
  if (picks.length === 0) {
    return rules(
      "I checked every open menu and found nothing for that. Try other words, like spicy, rice or burger.",
    );
  }
  return rules(
    "My clever brain is offline, so you're getting my simple matching. Still real dishes from menus that are open:",
    picks,
  );
}