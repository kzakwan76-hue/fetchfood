"use client";

import { useActionState } from "react";
import { ownDelivery } from "../app/dashboard/own-actions";

export function OwnDeliveryActions({ orderId, status }: { orderId: string; status: string }) {
  const [state, action, pending] = useActionState(ownDelivery, {});
  if (status !== "preparing" && status !== "out_for_delivery") return null;
  const dispatch = status === "preparing";

  return (
    <form action={action} className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="intent" value={dispatch ? "dispatch" : "delivered"} />
      <p className="font-semibold text-amber-900">Delivered by your own rider</p>
      <p className="text-amber-900">
        {dispatch
          ? "When your rider leaves with the food, tap the button. The customer is told it is on the way."
          : "After your rider hands over the food and collects the cash, tap Mark delivered. You keep the cash and owe FetchFood its commission."}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : dispatch ? "🛵 Send out with our rider" : "Mark delivered"}
      </button>
      {state.error && <p role="alert" className="mt-2 font-semibold text-red-700">{state.error}</p>}
    </form>
  );
}