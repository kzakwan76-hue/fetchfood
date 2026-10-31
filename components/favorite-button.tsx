"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "../app/customer/actions";

export function FavoriteButton({ restaurantId, initial }: { restaurantId: string; initial: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function click() {
    setError(null);
    start(async () => {
      const result = await toggleFavorite(restaurantId);
      if (result.error) setError(result.error);
      else setFavorite(result.isFavorite === true);
    });
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={favorite}
        aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl shadow-sm disabled:opacity-60 ${
          favorite ? "border-red-200 bg-red-50 text-red-600" : "border-brand-200 bg-white text-charcoal-700"
        }`}
      >
        <span aria-hidden="true">{favorite ? "♥" : "♡"}</span>
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-32 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}