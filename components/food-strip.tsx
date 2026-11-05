import Image from "next/image";

type Food = { name: string; emoji: string; tint: string };

const FOODS: Food[] = [
  { name: "Burger", emoji: "🍔", tint: "from-orange-300 to-red-400" },
  { name: "Pizza", emoji: "🍕", tint: "from-red-300 to-rose-500" },
  { name: "Biryani", emoji: "🍛", tint: "from-amber-300 to-orange-500" },
  { name: "Salad", emoji: "🥗", tint: "from-lime-300 to-green-500" },
  { name: "Shawarma", emoji: "🌯", tint: "from-yellow-300 to-amber-500" },
  { name: "Karahi", emoji: "🍲", tint: "from-orange-400 to-red-600" },
  { name: "Fries", emoji: "🍟", tint: "from-yellow-200 to-orange-400" },
  { name: "Pasta", emoji: "🍝", tint: "from-amber-200 to-red-400" },
  { name: "Wings", emoji: "🍗", tint: "from-orange-300 to-amber-600" },
  { name: "Kebab", emoji: "🍢", tint: "from-rose-300 to-red-600" },
  { name: "Dessert", emoji: "🍰", tint: "from-pink-300 to-fuchsia-500" },
  { name: "Chai", emoji: "☕", tint: "from-stone-300 to-amber-700" },
];

// Real photos: put your own licensed images in public/food and list them here, e.g. Burger: "/food/burger.jpg".
const PHOTOS: Record<string, string> = {};

const CSS = `
@media (prefers-reduced-motion: no-preference) {
  .food-tile { animation: food-float 4s ease-in-out infinite; }
}
@keyframes food-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
`;

export function FoodStrip() {
  return (
    <section aria-label="Popular food" className="mt-8">
      <style>{CSS}</style>
      <p className="text-center text-sm font-bold text-charcoal-800">Hungry already?</p>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {FOODS.map((f, i) => {
          const photo = PHOTOS[f.name];
          return (
            <li
              key={f.name}
              className="food-tile relative aspect-square overflow-hidden rounded-2xl shadow-card"
              style={{ animationDelay: `${(i % 6) * 0.35}s` }}
            >
              {photo ? (
                <Image src={photo} alt={f.name} fill sizes="120px" className="object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-linear-to-br ${f.tint}`}>
                  <span aria-hidden="true" className="text-5xl">
                    {f.emoji}
                  </span>
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-charcoal-900/60 py-0.5 text-center text-xs font-bold text-white">
                {f.name}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}