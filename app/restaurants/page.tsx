import Link from "next/link";
import { restaurants } from "../../lib/sample-data";
import { formatPKR } from "../../lib/pk";

export default function RestaurantsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm font-semibold text-brand-600">
        ← FetchFood
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Restaurants</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Sample data for now. Real restaurants arrive in later milestones.
      </p>

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
                ~{r.etaMinutes} min · Delivery {formatPKR(r.deliveryFeePkr)} · Min order{" "}
                {formatPKR(r.minOrderPkr)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}