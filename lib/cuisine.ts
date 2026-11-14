export type CuisineLook = { emoji: string; gradient: string };

// Placeholder visuals until restaurants get real photos.
const LOOKS: { match: RegExp; look: CuisineLook }[] = [
  { match: /biryani|pulao|rice/i, look: { emoji: "🍚", gradient: "from-amber-300 to-orange-500" } },
  { match: /burger|fast|fries|sandwich/i, look: { emoji: "🍔", gradient: "from-orange-400 to-red-500" } },
  { match: /pizza|italian|pasta/i, look: { emoji: "🍕", gradient: "from-red-400 to-rose-600" } },
  { match: /bbq|grill|tikka|kebab/i, look: { emoji: "🍢", gradient: "from-rose-400 to-red-700" } },
  { match: /chinese|asian|noodle/i, look: { emoji: "🍜", gradient: "from-yellow-300 to-amber-600" } },
  { match: /dessert|sweet|bakery|ice/i, look: { emoji: "🍰", gradient: "from-pink-300 to-fuchsia-500" } },
  { match: /cafe|café|coffee|tea|juice|drink/i, look: { emoji: "☕", gradient: "from-stone-400 to-amber-700" } },
  { match: /pakistani|desi|karahi|handi|curry/i, look: { emoji: "🍛", gradient: "from-orange-300 to-red-500" } },
];

const FALLBACK: CuisineLook = { emoji: "🍽️", gradient: "from-brand-300 to-brand-600" };

export function cuisineLook(cuisine: string): CuisineLook {
  return LOOKS.find((entry) => entry.match.test(cuisine))?.look ?? FALLBACK;
}

// Browse categories (the chips). A restaurant's cuisine is free text, so each category is a keyword rule.
// Word boundaries (\b) stop "Steak" matching "tea" and "Spice" matching "ice".
export type Category = { key: string; label: string; emoji: string; match: RegExp };

export const CATEGORIES: Category[] = [
  { key: "pizza", label: "Pizza", emoji: "🍕", match: /pizza|italian|pasta/i },
  { key: "burger", label: "Burger", emoji: "🍔", match: /burger|\bfast\b|fries|sandwich/i },
  { key: "asian", label: "Asian", emoji: "🍜", match: /chinese|asian|noodle/i },
  { key: "desi", label: "Desi", emoji: "🍛", match: /pakistani|desi|karahi|handi|curry/i },
  { key: "biryani", label: "Biryani", emoji: "🍚", match: /\bbiryani\b|\bpulao\b|\brice\b/i },
  { key: "bbq", label: "BBQ", emoji: "🍢", match: /bbq|grill|tikka|kebab/i },
  { key: "dessert", label: "Dessert", emoji: "🍰", match: /dessert|sweet|bakery|\bice\b/i },
  { key: "cafe", label: "Café", emoji: "☕", match: /\bcafe\b|caf\u00e9|\bcoffee\b|\btea\b|\bjuices?\b|\bdrinks?\b/i },
];

// Turns a value from the URL into a known category key, or null (show everything).
export function parseCategory(value: string | null | undefined): string | null {
  return CATEGORIES.some((c) => c.key === value) ? (value as string) : null;
}

export function matchesCategory(cuisine: string, key: string | null): boolean {
  if (!key) return true;
  const category = CATEGORIES.find((c) => c.key === key);
  return category ? category.match.test(cuisine) : true;
}