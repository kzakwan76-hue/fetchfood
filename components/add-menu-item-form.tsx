"use client";

import { useActionState } from "react";
import { addMenuItem } from "../app/dashboard/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";

export function AddMenuItemForm({ restaurantId }: { restaurantId: string }) {
  const [state, formAction, pending] = useActionState(addMenuItem, {});

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="font-semibold text-neutral-900">Add a menu item</p>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <label className="block text-sm font-medium text-neutral-800">
        Name
        <input name="name" type="text" required maxLength={80} className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Category (e.g. Mains, Drinks)
        <input name="category" type="text" required maxLength={40} className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Description (optional)
        <input name="description" type="text" maxLength={200} className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Price (whole rupees)
        <input name="price" type="number" inputMode="numeric" min={1} max={100000} step={1} required className={inputClass} />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm font-semibold text-green-800">Added.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add item"}
      </button>
    </form>
  );
}