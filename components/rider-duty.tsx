"use client";

import { useActionState } from "react";
import { setDuty } from "../app/rider/duty-actions";
import { formatOrderTime } from "../lib/order-status";

export function RiderDuty({ on, until }: { on: boolean; until: string | null }) {
  const [state, action, pending] = useActionState(setDuty, {});
  return (
    <section className={`rounded-2xl border p-4 text-sm ${on ? "border-green-300 bg-green-50" : "border-neutral-200 bg-white"}`}>
      <form action={action} className="flex items-center justify-between gap-3">
        <input type="hidden" name="on" value={on ? "false" : "true"} />
        <div>
          <p className="font-bold text-charcoal-900">{on ? "You are ON DUTY" : "You are off duty"}</p>
          <p className="text-neutral-700">
            {on
              ? `${until ? `Until ${formatOrderTime(until)}. ` : ""}You get alerts for new orders.`
              : "Go on duty to see and take orders. Duty lasts 8 hours."}
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className={`shrink-0 rounded-lg px-3 py-2 font-semibold disabled:opacity-60 ${
            on ? "border border-neutral-300 bg-white text-neutral-800" : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {pending ? "…" : on ? "Go off duty" : "Go on duty"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-2 text-red-700">{state.error}</p>}
    </section>
  );
}