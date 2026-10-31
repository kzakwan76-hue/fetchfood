import Link from "next/link";
import { CartView } from "../../components/cart-view";
import { FlowSteps } from "../../components/flow-steps";

export default function CartPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-700">
        ← Restaurants
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal-900">Your cart</h1>
      <FlowSteps current={1} />
      <CartView />
    </main>
  );
}