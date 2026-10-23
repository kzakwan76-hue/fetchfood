"use client";

import { useActionState } from "react";
import { updateMenuItem } from "../app/dashboard/actions";

type Item = { id: string; name: string; category: string; pricePkr: number; isAvailable: boolean };

export function MenuItemEditor({ item }: { item: Item }) {
  const [toggleState, toggleAction, togglePending] = useActionState(updateMenuItem, {});
  const [priceState, priceAction, pricePending] = useActionState(updateMenuItem, {});
  const error = toggleState.error ?? priceState.error;

  return (
    <li className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">{item.name}</p>
          <p className="text-xs text-neutral-500">
            {item.category} · {item.isAvailable ? "Visible to customers" : "Hidden from customers"}
          </p>
        </div>
        <form action={toggleAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="intent" value="toggle" />
          <input type="hidden" name="available" value={item.isAvailable ? "false" : "true"} />
          <button
            type="submit"
            disabled={togglePending}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1 text-sm font-semibold text-neutral-800 disabled:opacity-60"
          >
            {item.isAvailable ? "Hide" : "Show"}
          </button>
        </form>
      </div>

      <form action={priceAction} className="flex items-center gap-2">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="intent" value="price" />
        <label className="flex items-center gap-1 text-sm text-neutral-700">
          Rs.
          <input
            name="price"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            step={1}
            required
            defaultValue={item.pricePkr}
            className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-neutral-900"
          />
        </label>
        <button
          type="submit"
          disabled={pricePending}
          className="rounded-lg bg-brand-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
        >
          Save price
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}