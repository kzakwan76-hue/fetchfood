import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RestaurantBanner } from "../../components/restaurant-banner";
import { ListSkeleton } from "../../components/skeleton";
import { createClient } from "../../lib/supabase/server";

export const metadata = { title: "Favourites" };

type Row = {
  restaurant_id: string;
  restaurants: { slug: string; name: string; cuisine: string; area: string; is_open: boolean } | null;
};

export default function FavouritesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">Your favourites</h1>
      <Suspense fallback={<ListSkeleton rows={2} height="h-40" />}>
        <FavouriteList />
      </Suspense>
    </main>
  );
}

async function FavouriteList() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data } = await supabase
    .from("favorites")
    .select("restaurant_id, restaurants(slug, name, cuisine, area, is_open)")
    .order("created_at", { ascending: false });
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.restaurants);

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-brand-200 bg-white p-6 text-center shadow-card">
        <p className="font-bold text-charcoal-900">No favourites yet</p>
        <p className="mt-1 text-sm text-charcoal-700">Tap the heart on a restaurant page to save it here.</p>
        <Link
          href="/restaurants"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Browse restaurants
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-5 space-y-4">
      {rows.map((row) => {
        const r = row.restaurants!;
        return (
          <li key={row.restaurant_id}>
            <Link
              href={`/restaurants/${r.slug}`}
              className="block overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card hover:shadow-lift"
            >
              <RestaurantBanner cuisine={r.cuisine} dimmed={!r.is_open} />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-charcoal-900">{r.name}</p>
                  <p className="text-sm text-charcoal-700">
                    {r.cuisine} · {r.area}
                  </p>
                </div>
                <span
                  className={
                    r.is_open
                      ? "shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800"
                      : "shrink-0 rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700"
                  }
                >
                  {r.is_open ? "Open" : "Closed"}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}