import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AddToCart } from "../../../components/add-to-cart";
import { CartBar } from "../../../components/cart-bar";
import { getRestaurants, getRestaurantWithMenu } from "../../../lib/catalog";
import { formatPKR } from "../../../lib/pk";

export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  return restaurants.map((r) => ({ slug: r.slug }));
}

// The frame (back link, cart bar) is static. Only the menu waits for data.
export default function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-600">
        ← All restaurants
      </Link>
      <Suspense fallback={<MenuSkeleton />}>
        <RestaurantMenu params={params} />
      </Suspense>
      <CartBar />
    </main>
  );
}

function MenuSkeleton() {
  return (
    <div className="mt-3 animate-pulse space-y-3" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-neutral-200" />
      <div className="h-4 w-64 rounded bg-neutral-200" />
      <div className="mt-6 h-40 rounded-2xl bg-neutral-200" />
    </div>
  );
}

async function RestaurantMenu({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantWithMenu(slug);
  if (!restaurant) notFound();

  const categories = [...new Set(restaurant.items.map((i) => i.category))];
  const forCart = {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    deliveryFeePkr: restaurant.deliveryFeePkr,
    minOrderPkr: restaurant.minOrderPkr,
  };

  return (
    <>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">{restaurant.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {restaurant.cuisine} · {restaurant.area} · ~{restaurant.etaMinutes} min
      </p>
      <p className="mt-1 text-sm text-neutral-700">
        Delivery {formatPKR(restaurant.deliveryFeePkr)} · Min order {formatPKR(restaurant.minOrderPkr)}
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
                    <p className="mt-1 text-sm font-semibold text-brand-600">{formatPKR(item.pricePkr)}</p>
                  </div>
                  <AddToCart
                    restaurant={forCart}
                    item={{ id: item.id, name: item.name, pricePkr: item.pricePkr }}
                    disabled={!restaurant.isOpen}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}