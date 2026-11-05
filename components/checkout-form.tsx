"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { placeOrder } from "../app/checkout/actions";
import { quoteDelivery, type Quote } from "../app/checkout/quote-actions";
import { subtotalPkr } from "../lib/cart";
import { useCart } from "../lib/cart-store";
import { formatPKR } from "../lib/pk";
import { useZone } from "../lib/zone-store";
import { LocationPicker, type Pin } from "./location-picker";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";

type SavedAddress = { id: string; label: string; address: string; lat: number | null; lng: number | null };
type KeyedQuote = Quote & { key: string };

export function CheckoutForm({
  defaultPhone,
  addresses,
}: {
  defaultPhone: string;
  addresses: SavedAddress[];
}) {
  const cart = useCart();
  const zone = useZone();
  const [state, formAction, pending] = useActionState(placeOrder, {});
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<Pin | null>(null);
  const [quote, setQuote] = useState<KeyedQuote | null>(null);
  // Same key for every submit from this page, so a double tap or retry cannot create two orders.
  const [idem] = useState(() => crypto.randomUUID());

  const restaurantId = cart.restaurantId;
  const lat = pin?.lat ?? null;
  const lng = pin?.lng ?? null;
  const key = `${restaurantId ?? ""}|${lat ?? ""}|${lng ?? ""}`;

  // Ask the server for the delivery fee whenever the pin moves (after a short pause).
  useEffect(() => {
    if (!restaurantId) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const result = await quoteDelivery(restaurantId, lat, lng);
      if (alive && result) setQuote({ ...result, key: `${restaurantId}|${lat ?? ""}|${lng ?? ""}` });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [restaurantId, lat, lng]);

  if (cart.lines.length === 0) {
    return (
      <p className="mt-6 text-neutral-700">
        Your cart is empty.{" "}
        <Link href="/restaurants" className="font-semibold text-brand-600">
          Browse restaurants
        </Link>
      </p>
    );
  }

  if (!zone) {
    return (
      <p className="mt-6 text-neutral-700">
        Choose your delivery area first.{" "}
        <Link href="/restaurants" className="font-semibold text-brand-600">
          Choose area
        </Link>
      </p>
    );
  }

  const current = quote && quote.key === key ? quote : null;
  const priced = current && (current.status === "ok" || current.status === "flat") && current.fee !== null;
  const fee = priced && current?.fee != null ? current.fee : cart.deliveryFeePkr;
  const total = subtotalPkr(cart) + fee;
  const blocked = current?.status === "no_pin" || current?.status === "too_far";

  const known = addresses.some((a) => a.address.trim().toLowerCase() === address.trim().toLowerCase());
  const canSave = !known && addresses.length < 5 && address.trim().length >= 10;

  // IDs and quantities only. No prices are sent to the server.
  const payload = JSON.stringify({
    restaurantId: cart.restaurantId,
    items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
  });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="cart" value={payload} />
      <input type="hidden" name="zoneId" value={zone.id} />
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="lat" value={pin ? String(pin.lat) : ""} />
      <input type="hidden" name="lng" value={pin ? String(pin.lng) : ""} />

      <p className="text-sm text-neutral-600">
        {cart.restaurantName} · {formatPKR(subtotalPkr(cart))} + {priced ? formatPKR(fee) : "…"} delivery
      </p>
      <p className="text-sm text-neutral-700">
        Delivering to: <strong>{zone.name}</strong>{" "}
        <Link href="/restaurants" className="font-semibold text-brand-600 underline">
          Change
        </Link>
      </p>

      {addresses.length > 0 && (
        <div>
          <p className="text-sm font-medium text-neutral-800">Your saved addresses</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAddress(a.address);
                  if (a.lat !== null && a.lng !== null) setPin({ lat: a.lat, lng: a.lng });
                }}
                className="rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-charcoal-900 hover:bg-brand-100"
              >
                {a.label}
                {a.lat !== null ? " 📍" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm font-medium text-neutral-800">
        Delivery address
        <textarea
          name="address"
          rows={3}
          required
          minLength={10}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House / street / area / landmark"
          className={inputClass}
        />
      </label>

      <div>
        <p className="text-sm font-medium text-neutral-800">Drop a pin (helps your rider, and sets your delivery fee)</p>
        <p className="mb-2 text-xs text-neutral-600">
          Your rider sees the pin only after the restaurant hands over your food.
        </p>
        <LocationPicker value={pin} onChange={setPin} />
      </div>

      {current?.status === "ok" && current.km !== null && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
          About <strong>{current.km} km</strong> away (straight line) · Delivery <strong>{formatPKR(fee)}</strong>
        </p>
      )}
      {current?.status === "no_pin" && (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This restaurant prices delivery by distance. Drop a pin to see your delivery fee.
        </p>
      )}
      {current?.status === "too_far" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Too far: you&apos;re about {current.km} km away and this restaurant delivers up to {current.max} km. Try another
          restaurant or move the pin.
        </p>
      )}

      {canSave && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm">
          <label className="flex items-center gap-2 font-medium text-neutral-800">
            <input type="checkbox" name="saveAddress" />
            Save this address{pin ? " and pin" : ""} for next time
          </label>
          <input
            name="saveLabel"
            maxLength={30}
            placeholder="Label, e.g. Home or Work"
            aria-label="Label for the saved address"
            className={inputClass}
          />
        </div>
      )}

      <label className="block text-sm font-medium text-neutral-800">
        Mobile number
        <input
          name="phone"
          type="tel"
          required
          defaultValue={state.values?.phone ?? defaultPhone}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Note for the restaurant (optional)
        <input name="note" type="text" maxLength={200} defaultValue={state.values?.note ?? ""} className={inputClass} />
      </label>

      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
        Payment: <strong>cash on delivery</strong>. You pay the rider about <strong>{formatPKR(total)}</strong>. The
        final total is calculated by our server.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || blocked}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {pending ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}