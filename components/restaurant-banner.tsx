import { cuisineLook } from "../lib/cuisine";

export function RestaurantBanner({
  cuisine,
  size = "card",
  dimmed = false,
}: {
  cuisine: string;
  size?: "card" | "hero";
  dimmed?: boolean;
}) {
  const look = cuisineLook(cuisine);
  const height = size === "hero" ? "h-40 sm:h-48" : "h-28";
  const emoji = size === "hero" ? "text-7xl" : "text-5xl";

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-linear-to-br ${look.gradient} ${height} ${
        dimmed ? "opacity-60 grayscale" : ""
      }`}
    >
      <span className="absolute -right-4 -top-6 rotate-12 text-9xl opacity-20">{look.emoji}</span>
      <span className={emoji}>{look.emoji}</span>
    </div>
  );
}