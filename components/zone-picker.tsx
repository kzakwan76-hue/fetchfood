"use client";

import { useState } from "react";
import { EMPTY_CART } from "../lib/cart";
import { getCart, setCart } from "../lib/cart-store";
import { setZone, useHydrated, useZone } from "../lib/zone-store";

export type ZoneOption = { id: string; name: string };

export function ZonePicker({ zones }: { zones: ZoneOption[] }) {
  const hydrated = useHydrated();
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

  // Wait for the browser to read the saved area, so returning customers never see a flash of the picker.
  if (!hydrated) return <div aria-hidden="true" className="skeleton mx-auto h-14 w-full max-w-sm" />;

  if (current && !open) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <span aria-hidden="true">📍</span>
        <span className="text-charcoal-700">Delivering to</span>
        <strong className="text-charcoal-900">{current.name}</strong>
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-brand-700 underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-charcoal-800">Where should we deliver?</p>
      {zones.length === 0 ? (
        <p className="mt-2 text-sm text-charcoal-700">No delivery areas yet.</p>
      ) : (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => choose(z)}
              className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800 shadow-sm hover:border-brand-500 hover:bg-brand-100"
            >
              {z.name}
            </button>
          ))}
        </div>
      )}
      {current && (
        <button type="button" onClick={() => setOpen(false)} className="mt-3 text-sm text-charcoal-700 underline">
          Cancel
        </button>
      )}
    </div>
  );
}