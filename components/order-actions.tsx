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
  preparing: [{ status: "out_for_delivery", label: "Out for delivery" }],
  out_for_delivery: [{ status: "delivered", label: "Mark delivered" }],
};

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const [state, formAction, pending] = useActionState(changeOrderStatus, {});
  const options = NEXT[status] ?? [];
  if (options.length === 0) return null;

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
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