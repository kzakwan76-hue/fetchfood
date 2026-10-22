"use client";

import Link from "next/link";
import { EMPTY_CART, meetsMinimum, setQuantity, subtotalPkr, totalPkr } from "../lib/cart";
import { getCart, setCart, useCart } from "../lib/cart-store";
import { formatPKR } from "../lib/pk";

const btn =
  "rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-semibold text-neutral-800 hover:border-brand-500";

export function CartView() {
  const cart = useCart();

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

  const subtotal = subtotalPkr(cart);
  const canCheckout = meetsMinimum(cart);

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-neutral-600">From {cart.restaurantName}</p>
      <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
        {cart.lines.map((line) => (
          <li key={line.menuItemId} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-neutral-900">{line.name}</p>
              <p className="text-sm text-neutral-600">{formatPKR(line.pricePkr)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Remove one ${line.name}`}
                className={btn}
                onClick={() => setCart(setQuantity(getCart(), line.menuItemId, line.quantity - 1))}
              >
                −
              </button>
              <span className="w-5 text-center font-semibold">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Add one more ${line.name}`}
                className={btn}
                onClick={() => setCart(setQuantity(getCart(), line.menuItemId, line.quantity + 1))}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd>{formatPKR(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-600">Delivery fee</dt>
          <dd>{formatPKR(cart.deliveryFeePkr)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-neutral-900">
          <dt>Total (cash on delivery)</dt>
          <dd>{formatPKR(totalPkr(cart))}</dd>
        </div>
      </dl>
      <p className="text-xs text-neutral-500">
        Prices shown here are a preview. The final total is calculated by our server when you place the order.
      </p>

      {canCheckout ? (
        <Link
          href="/checkout"
          className="block rounded-lg bg-brand-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-500"
        >
          Checkout
        </Link>
      ) : (
        <p className="rounded-lg bg-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800">
          Minimum order is {formatPKR(cart.minOrderPkr)}. Add {formatPKR(cart.minOrderPkr - subtotal)} more.
        </p>
      )}

      <button type="button" onClick={() => setCart(EMPTY_CART)} className="text-sm text-neutral-600 underline">
        Clear cart
      </button>
    </div>
  );
}