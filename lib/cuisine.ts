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