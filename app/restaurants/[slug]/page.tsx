import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurant, restaurants } from "../../../lib/sample-data";
import { formatPKR } from "../../../lib/pk";

export function generateStaticParams() {
  return restaurants.map((r) => ({ slug: r.slug }));
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();

  const categories = [...new Set(restaurant.items.map((i) => i.category))];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-600">
        ← All restaurants
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">{restaurant.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {restaurant.cuisine} · {restaurant.area} · ~{restaurant.etaMinutes} min
      </p>
      <p className="mt-1 text-sm text-neutral-700">
        Delivery {formatPKR(restaurant.deliveryFeePkr)} · Min order{" "}
        {formatPKR(restaurant.minOrderPkr)}
      </p>
      {!restaurant.isOpen && (
        <p className="mt-3 rounded-lg bg-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800">
          Closed right now
        </p>
      )}

      {categories.map((category) => (
        <section key={category} className="mt-6">
          <h2 className="text-lg font-semibold text-neutral-900">{category}</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
            {restaurant.items
              .filter((i) => i.category === category)
              .map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-neutral-900">{item.name}</p>
                    <p className="text-sm text-neutral-600">{item.description}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-brand-600">
                    {formatPKR(item.pricePkr)}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}