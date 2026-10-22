import Link from "next/link";
import { CartView } from "../../components/cart-view";

export default function CartPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-600">
        ← Restaurants
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Your cart</h1>
      <CartView />
    </main>
  );
}