import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AddToCart } from "../../../components/add-to-cart";
import { CartBar } from "../../../components/cart-bar";
import { RestaurantBanner } from "../../../components/restaurant-banner";
import { Skeleton } from "../../../components/skeleton";
import { getRestaurants, getRestaurantWithMenu } from "../../../lib/catalog";
import { formatPKR } from "../../../lib/pk";

export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  return restaurants.map((r) => ({ slug: r.slug }));
}

// The frame (back link, cart bar) is static. Only the menu waits for data.
export default function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-700">
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
    <div className="mt-4 space-y-4" role="status" aria-label="Loading menu">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
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
      <div className="mt-4 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
        <RestaurantBanner cuisine={restaurant.cuisine} size="hero" dimmed={!restaurant.isOpen} />
        <div className="p-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-900">{restaurant.name}</h1>
          <p className="mt-0.5 text-sm text-charcoal-700">
            {restaurant.cuisine} · {restaurant.area}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-charcoal-800">
            <span className="rounded-full bg-brand-100 px-2.5 py-1">~{restaurant.etaMinutes} min</span>
            <span className="rounded-full bg-brand-100 px-2.5 py-1">
              Delivery {formatPKR(restaurant.deliveryFeePkr)}
            </span>
            <span className="rounded-full bg-brand-100 px-2.5 py-1">
              Min order {formatPKR(restaurant.minOrderPkr)}
            </span>
          </div>
          {!restaurant.isOpen && (
            <p className="mt-3 rounded-xl bg-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800">
              Closed right now. Check back soon.
            </p>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <nav
          aria-label="Menu categories"
          className="no-scrollbar sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto bg-brand-50/90 px-4 py-2 backdrop-blur"
        >
          <ul className="flex gap-2">
            {categories.map((category, index) => (
              <li key={category}>
                <a
                  href={`#cat-${index}`}
                  className="block whitespace-nowrap rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-charcoal-800 hover:bg-brand-100"
                >
                  {category}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {categories.map((category, index) => (
        <section key={category} id={`cat-${index}`} className="mt-6 scroll-mt-16">
          <h2 className="text-lg font-bold text-charcoal-900">{category}</h2>
          <ul className="mt-2 divide-y divide-brand-100 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
            {restaurant.items
              .filter((i) => i.category === category)
              .map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal-900">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-charcoal-700">{item.description}</p>
                    )}
                    <p className="mt-1.5 text-sm font-bold text-brand-700">{formatPKR(item.pricePkr)}</p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <AddToCart
                      restaurant={forCart}
                      item={{ id: item.id, name: item.name, pricePkr: item.pricePkr }}
                      disabled={!restaurant.isOpen}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}