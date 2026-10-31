"use client";

import Link from "next/link";
import { EMPTY_CART, meetsMinimum, setQuantity, subtotalPkr, totalPkr } from "../lib/cart";
import { getCart, setCart, useCart } from "../lib/cart-store";
import { formatPKR } from "../lib/pk";
import { MokaMascot } from "./moka-mascot";

const stepper =
  "flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-white text-lg font-semibold text-charcoal-800 hover:bg-brand-100";

export function CartView() {
  const cart = useCart();

  if (cart.lines.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center rounded-3xl border border-brand-200 bg-white p-8 text-center shadow-card">
        <MokaMascot variant="full" size={120} />
        <p className="mt-3 text-lg font-bold text-charcoal-900">Your cart is empty</p>
        <p className="mt-1 text-sm text-charcoal-700">Moka is staring at it, waiting for you to decide.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/restaurants"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse restaurants
          </Link>
          <Link
            href="/assistant"
            className="rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal-800 hover:bg-brand-100"
          >
            Ask Moka
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = subtotalPkr(cart);
  const canCheckout = meetsMinimum(cart);

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-charcoal-700">
        From <strong className="text-charcoal-900">{cart.restaurantName}</strong>{" "}
        <Link href={`/restaurants/${cart.restaurantSlug}`} className="font-semibold text-brand-700 underline">
          Add more
        </Link>
      </p>

      <ul className="divide-y divide-brand-100 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
        {cart.lines.map((line) => (
          <li key={line.menuItemId} className="p-4">
            <div className="flex justify-between gap-3">
              <p className="font-semibold text-charcoal-900">{line.name}</p>
              <p className="shrink-0 font-bold text-charcoal-900">{formatPKR(line.pricePkr * line.quantity)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-charcoal-700">{formatPKR(line.pricePkr)} each</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Remove one ${line.name}`}
                  className={stepper}
                  onClick={() => setCart(setQuantity(getCart(), line.menuItemId, line.quantity - 1))}
                >
                  −
                </button>
                <span className="w-5 text-center font-semibold">{line.quantity}</span>
                <button
                  type="button"
                  aria-label={`Add one more ${line.name}`}
                  className={stepper}
                  onClick={() => setCart(setQuantity(getCart(), line.menuItemId, line.quantity + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <dl className="space-y-1.5 rounded-3xl border border-brand-200 bg-white p-4 text-sm shadow-card">
        <div className="flex justify-between">
          <dt className="text-charcoal-700">Subtotal</dt>
          <dd>{formatPKR(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-700">Delivery fee</dt>
          <dd>{formatPKR(cart.deliveryFeePkr)}</dd>
        </div>
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-bold text-charcoal-900">
          <dt>Total (cash on delivery)</dt>
          <dd>{formatPKR(totalPkr(cart))}</dd>
        </div>
      </dl>
      <p className="text-xs text-charcoal-700">
        Prices shown here are a preview. The final total is calculated by our server when you place the order.
      </p>

      {canCheckout ? (
        <Link
          href="/checkout"
          className="block rounded-2xl bg-brand-600 px-4 py-3 text-center font-bold text-white shadow-card hover:bg-brand-700"
        >
          Checkout
        </Link>
      ) : (
        <p className="rounded-2xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-800">
          Minimum order is {formatPKR(cart.minOrderPkr)}. Add {formatPKR(cart.minOrderPkr - subtotal)} more.
        </p>
      )}

      <button type="button" onClick={() => setCart(EMPTY_CART)} className="text-sm text-charcoal-700 underline">
        Clear cart
      </button>
    </div>
  );
}