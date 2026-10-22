"use client";

import Link from "next/link";
import { useActionState } from "react";
import { placeOrder } from "../app/checkout/actions";
import { subtotalPkr, totalPkr } from "../lib/cart";
import { useCart } from "../lib/cart-store";
import { formatPKR } from "../lib/pk";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";

export function CheckoutForm({ defaultPhone }: { defaultPhone: string }) {
  const cart = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, {});

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

  // IDs and quantities only. No prices are sent to the server.
  const payload = JSON.stringify({
    restaurantId: cart.restaurantId,
    items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
  });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="cart" value={payload} />

      <p className="text-sm text-neutral-600">
        {cart.restaurantName} · {formatPKR(subtotalPkr(cart))} + {formatPKR(cart.deliveryFeePkr)} delivery
      </p>

      <label className="block text-sm font-medium text-neutral-800">
        Delivery address
        <textarea
          name="address"
          rows={3}
          required
          minLength={10}
          defaultValue={state.values?.address ?? ""}
          placeholder="House / street / area / landmark"
          className={inputClass}
        />
      </label>
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