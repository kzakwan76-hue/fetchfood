"use client";

import { useActionState } from "react";
import { setRestaurantOpen } from "../app/dashboard/actions";

export function RestaurantOpenToggle({
  restaurantId,
  name,
  isOpen,
}: {
  restaurantId: string;
  name: string;
  isOpen: boolean;
}) {
  const [state, formAction, pending] = useActionState(setRestaurantOpen, {});

  return (
    <form action={formAction} className="rounded-2xl border border-neutral-200 bg-white p-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="open" value={isOpen ? "false" : "true"} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-900">{name}</p>
          <p className="text-sm text-neutral-600">{isOpen ? "Open for orders" : "Closed to new orders"}</p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isOpen ? "Close" : "Open"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}