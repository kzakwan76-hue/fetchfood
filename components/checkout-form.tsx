"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrder } from "../app/checkout/actions";
import { subtotalPkr, totalPkr } from "../lib/cart";
import { useCart } from "../lib/cart-store";
import { formatPKR } from "../lib/pk";
import { useZone } from "../lib/zone-store";
import { LocationPicker, type Pin } from "./location-picker";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";

type SavedAddress = { id: string; label: string; address: string; lat: number | null; lng: number | null };

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
  // Same key for every submit from this page, so a double tap or retry cannot create two orders.
  const [idem] = useState(() => crypto.randomUUID());

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
        {cart.restaurantName} · {formatPKR(subtotalPkr(cart))} + {formatPKR(cart.deliveryFeePkr)} delivery
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
        <p className="text-sm font-medium text-neutral-800">Drop a pin (optional, helps your rider find you)</p>
        <p className="mb-2 text-xs text-neutral-600">
          Your rider sees the pin only after the restaurant hands over your food.
        </p>
        <LocationPicker value={pin} onChange={setPin} />
      </div>

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
        Payment: <strong>cash on delivery</strong>. You pay the rider about{" "}
        <strong>{formatPKR(totalPkr(cart))}</strong>. The final total is calculated by our server.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {pending ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}