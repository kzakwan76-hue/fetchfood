import Image from "next/image";
import { cuisineLook } from "../lib/cuisine";

export function RestaurantBanner({
  cuisine,
  imageUrl = null,
  size = "card",
  dimmed = false,
}: {
  cuisine: string;
  imageUrl?: string | null;
  size?: "card" | "hero";
  dimmed?: boolean;
}) {
  const look = cuisineLook(cuisine);
  const height = size === "hero" ? "h-40 sm:h-48" : "h-28";
  const emoji = size === "hero" ? "text-7xl" : "text-5xl";
  const dim = dimmed ? "opacity-60 grayscale" : "";

  if (imageUrl) {
    return (
      <div aria-hidden="true" className={`relative overflow-hidden bg-brand-100 ${height} ${dim}`}>
        <Image src={imageUrl} alt="" fill sizes="(max-width: 672px) 100vw, 672px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-linear-to-br ${look.gradient} ${height} ${dim}`}
    >
      <span className="absolute -right-4 -top-6 rotate-12 text-9xl opacity-20">{look.emoji}</span>
      <span className={emoji}>{look.emoji}</span>
    </div>
  );
}