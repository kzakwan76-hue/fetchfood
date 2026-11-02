"use client";

import { useActionState } from "react";
import { riderAction } from "../app/rider/actions";

export function RiderCall({ orderId, phone, calledAt }: { orderId: string; phone: string; calledAt: string | null }) {
  const [state, action, pending] = useActionState(riderAction, {});
  return (
    <div className="mt-3 space-y-2">
      <a href={`tel:${phone}`} className="inline-block rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
        📞 Call customer to confirm
      </a>
      {calledAt ? (
        <p className="text-sm font-semibold text-green-800">Confirmation call recorded.</p>
      ) : (
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="intent" value="called" />
          <button type="submit" disabled={pending} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-60">
            {pending ? "Saving…" : "I called and the customer confirmed"}
          </button>
        </form>
      )}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </div>
  );
}