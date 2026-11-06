"use client";

import { useActionState } from "react";
import { recordRemittance, setOwnDelivery, updateOwnDiscount } from "../app/admin/own-actions";

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const button = "rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50";

function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>;
  return null;
}

export function OwnToggleForm({ restaurantId, on }: { restaurantId: string; on: boolean }) {
  const [state, action, pending] = useActionState(setOwnDelivery, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="on" value={on ? "false" : "true"} />
      <Msg {...state} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          const text = on
            ? "Switch off own riders? New orders will use FetchFood riders again. Orders already placed keep their way of delivery."
            : "Switch on own riders for this restaurant? New orders will be delivered by the restaurant's own riders at the lower commission.";
          if (!window.confirm(text)) e.preventDefault();
        }}
        className={on ? "rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50" : button}
      >
        {pending ? "Saving…" : on ? "Switch off own riders" : "Switch on own riders"}
      </button>
    </form>
  );
}

export function DiscountForm({ discountPct }: { discountPct: number }) {
  const [state, action, pending] = useActionState(updateOwnDiscount, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block font-medium">
        Commission discount for own riders (percentage points)
        <input name="discount" type="number" step="0.01" min={0} max={50} required defaultValue={discountPct} className={input} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save discount"}</button>
    </form>
  );
}

export function RemitForm({ restaurantId, max }: { restaurantId: string; max: number }) {
  const [state, action, pending] = useActionState(recordRemittance, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min={1} max={max} required defaultValue={max} aria-label="Amount received (Rs.)" className={input} />
        <input name="note" maxLength={200} placeholder="Note, e.g. bank ref" aria-label="Note" className={input} />
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Recording…" : "Record payment received"}</button>
    </form>
  );
}