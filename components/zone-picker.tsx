"use client";

import { useState } from "react";
import { EMPTY_CART } from "../lib/cart";
import { getCart, setCart } from "../lib/cart-store";
import { setZone, useZone } from "../lib/zone-store";

export type ZoneOption = { id: string; name: string };

export function ZonePicker({ zones }: { zones: ZoneOption[] }) {
  const chosen = useZone();
  const current = zones.find((z) => z.id === chosen?.id) ?? null;
  const [open, setOpen] = useState(false);

  function choose(zone: ZoneOption) {
    if (current && zone.id === current.id) {
      setOpen(false);
      return;
    }
    // Changing area clears the cart: it may hold a restaurant from the old area.
    if (current && getCart().lines.length > 0 && !window.confirm("Changing your area clears your cart. Continue?")) {
      return;
    }
    if (current) setCart(EMPTY_CART);
    setZone({ id: zone.id, name: zone.name });
    setOpen(false);
  }

  if (current && !open) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-neutral-700">Delivering to</span>
        <strong className="text-neutral-900">{current.name}</strong>
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-brand-600 underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-neutral-800">Where should we deliver?</p>
      {zones.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">No delivery areas yet.</p>
      ) : (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => choose(z)}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-brand-500"
            >
              {z.name}
            </button>
          ))}
        </div>
      )}
      {current && (
        <button type="button" onClick={() => setOpen(false)} className="mt-2 text-sm text-neutral-600 underline">
          Cancel
        </button>
      )}
    </div>
  );
}