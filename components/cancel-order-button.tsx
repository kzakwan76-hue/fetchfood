"use client";

import { useActionState } from "react";
import { changeOrderStatus } from "../app/orders/actions";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(changeOrderStatus, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value="cancelled" />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm("Cancel this order?")) e.preventDefault();
        }}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-60"
      >
        Cancel order
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}