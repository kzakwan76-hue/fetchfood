"use client";

import { useActionState } from "react";
import { handoverOrder } from "../app/dashboard/handover-actions";

const VEHICLES: Record<string, string> = { bike: "Motorbike", bicycle: "Bicycle", car: "Car" };

export function HandoverForm({
  orderId, name, vehicle, reg, phone,
}: {
  orderId: string;
  name: string;
  vehicle: string | null;
  reg: string | null;
  phone: string | null;
}) {
  const [state, action, pending] = useActionState(handoverOrder, {});
  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-bold text-amber-900">🛵 {name} is coming to pick this up</p>
      <p className="text-amber-900">
        {VEHICLES[vehicle ?? ""] ?? "Vehicle"}
        {reg ? ` · ${reg}` : ""}
        {phone ? (
          <>
            {" · "}
            <a href={`tel:${phone}`} className="underline">{phone}</a>
          </>
        ) : null}
      </p>
      <p className="mt-1 text-amber-900">
        Before you hand over the food, ask them to show the 4-digit code in their FetchFood rider app and type it
        here. If it doesn&apos;t match, don&apos;t hand it over.
      </p>
      <form action={action} className="mt-2 flex gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <input
          name="code"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          placeholder="1234"
          aria-label="Pickup code"
          className="w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest"
        />
        <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-3 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? "Checking…" : "Confirm and hand over"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-2 font-semibold text-red-700">{state.error}</p>}
    </div>
  );
}