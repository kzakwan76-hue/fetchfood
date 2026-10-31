import Link from "next/link";
import { CartView } from "../../components/cart-view";

export default function CartPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-700">
        ← Restaurants
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-charcoal-900">Your cart</h1>
      <CartView />
    </main>
  );
}