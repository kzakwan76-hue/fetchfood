"use client";

import { useActionState } from "react";
import { changeOrderStatus } from "../app/orders/actions";

// UI hints only. The database enforces which changes are really allowed.
const NEXT: Record<string, { status: string; label: string }[]> = {
  placed: [
    { status: "accepted", label: "Accept" },
    { status: "cancelled", label: "Decline" },
  ],
  accepted: [
    { status: "preparing", label: "Start preparing" },
    { status: "cancelled", label: "Cancel" },
  ],
  preparing: [{ status: "out_for_delivery", label: "Deliver it ourselves" }],
  out_for_delivery: [{ status: "delivered", label: "Mark delivered" }],
};

export function OrderActions({
  orderId,
  status,
  hasRider = false,
}: {
  orderId: string;
  status: string;
  hasRider?: boolean;
}) {
  const [state, formAction, pending] = useActionState(changeOrderStatus, {});
  // Once a rider has taken the order, only the rider can move it on.
  const lockedToRider = hasRider && (status === "preparing" || status === "out_for_delivery");
  const options = lockedToRider ? [] : (NEXT[status] ?? []);

  if (lockedToRider) {
    return <p className="mt-3 text-sm text-neutral-600">A rider has this order.</p>;
  }
  if (options.length === 0) return null;

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      {status === "preparing" && (
        <p className="w-full text-sm text-neutral-600">
          Waiting for a rider to take it. Or deliver it yourselves.
        </p>
      )}
      {options.map((o) => (
        <button
          key={o.status}
          type="submit"
          name="status"
          value={o.status}
          disabled={pending}
          onClick={(e) => {
            if (o.status === "cancelled" && !window.confirm("Cancel this order?")) e.preventDefault();
          }}
          className={
            o.status === "cancelled"
              ? "rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-60"
              : "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          }
        >
          {o.label}
        </button>
      ))}
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}