"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadReorder } from "../app/customer/actions";
import { EMPTY_CART, addItem, setQuantity } from "../lib/cart";
import { getCart, setCart } from "../lib/cart-store";
import { useZone } from "../lib/zone-store";

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const zone = useZone();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reorder() {
    setError(null);
    setPending(true);
    try {
      const result = await loadReorder(orderId);
      if ("error" in result) return setError(result.error);
      if (!zone || zone.id !== result.restaurant.zoneId) {
        return setError("This restaurant isn't in your chosen area. Change your area on the restaurants page first.");
      }
      if (result.skipped > 0 && !window.confirm(`${result.skipped} dish(es) are no longer on the menu and will be left out. Continue?`)) {
        return;
      }
      if (getCart().lines.length > 0 && !window.confirm("This replaces what is in your cart. Continue?")) return;

      const { restaurant, lines } = result;
      let cart = EMPTY_CART;
      for (const line of lines) {
        cart = addItem(
          cart,
          {
            id: restaurant.id,
            slug: restaurant.slug,
            name: restaurant.name,
            deliveryFeePkr: restaurant.deliveryFeePkr,
            minOrderPkr: restaurant.minOrderPkr,
          },
          { id: line.id, name: line.name, pricePkr: line.pricePkr },
        );
        cart = setQuantity(cart, line.id, line.quantity);
      }
      setCart(cart);
      router.push("/cart");
    } catch {
      setError("Could not rebuild this order. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={reorder}
        disabled={pending}
        className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card hover:bg-brand-100 disabled:opacity-60"
      >
        {pending ? "Preparing your cart…" : "🔁 Order again"}
      </button>
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}