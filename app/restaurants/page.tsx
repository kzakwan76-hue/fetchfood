import Link from "next/link";
import { CartBar } from "../../components/cart-bar";
import { getRestaurants } from "../../lib/catalog";
import { formatPKR } from "../../lib/pk";

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="flex items-center justify-between text-sm font-semibold text-brand-600">
        <Link href="/">← FetchFood</Link>
        <span className="flex gap-4">
          <Link href="/cart">Cart</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/account">Account</Link>
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Restaurants</h1>
      <p className="mt-1 text-sm text-neutral-600">Sample restaurants for now, loaded from the database.</p>

      <ul className="mt-6 space-y-4">
        {restaurants.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/restaurants/${r.slug}`}
              className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-brand-500"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900">{r.name}</h2>
                <span
                  className={
                    r.isOpen
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
                      : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-700"
                  }
                >
                  {r.isOpen ? "Open" : "Closed"}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {r.cuisine} · {r.area}
              </p>
              <p className="mt-2 text-sm text-neutral-700">
                ~{r.etaMinutes} min · Delivery {formatPKR(r.deliveryFeePkr)} · Min order {formatPKR(r.minOrderPkr)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <CartBar />
    </main>
  );
}