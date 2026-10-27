"use client";

import { useActionState } from "react";
import { riderAction } from "../app/rider/actions";

type Props = {
  orderId: string;
  intent: "claim" | "release" | "deliver";
  label: string;
  confirmText?: string;
  secondary?: boolean;
};

export function RiderButton({ orderId, intent, label, confirmText, secondary }: Props) {
  const [state, action, pending] = useActionState(riderAction, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="intent" value={intent} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (confirmText && !window.confirm(confirmText)) e.preventDefault();
        }}
        className={
          secondary
            ? "rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-60"
            : "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        }
      >
        {pending ? "Please wait…" : label}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}