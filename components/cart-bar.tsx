"use client";

import Link from "next/link";
import { itemCount, subtotalPkr } from "../lib/cart";
import { useCart } from "../lib/cart-store";
import { formatPKR } from "../lib/pk";

export function CartBar() {
  const cart = useCart();
  const count = itemCount(cart);
  if (count === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed inset-x-4 bottom-4 mx-auto flex max-w-2xl items-center justify-between rounded-2xl bg-neutral-900 px-5 py-3 font-semibold text-white shadow-lg"
    >
      <span>
        View cart · {count} item{count > 1 ? "s" : ""}
      </span>
      <span>{formatPKR(subtotalPkr(cart))}</span>
    </Link>
  );
}