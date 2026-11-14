"use client";

import Link from "next/link";
import type { Restaurant } from "../lib/catalog";
import { formatPKR } from "../lib/pk";
import { useHydrated, useZone } from "../lib/zone-store";
import { RatingBadge } from "./rating-badge";
import { RestaurantBanner } from "./restaurant-banner";
import { ZonePicker, type ZoneOption } from "./zone-picker";

export function HomePicks({ restaurants, zones }: { restaurants: Restaurant[]; zones: ZoneOption[] }) {
  const hydrated = useHydrated();
  const chosen = useZone();

  if (!hydrated) return <div className="skeleton mt-8 h-48" />;

  const zone = zones.find((z) => z.id === chosen?.id) ?? null;
  if (!zone) {
    return (
      <section className="mt-8 rounded-3xl border border-brand-200 bg-white p-5 shadow-card">
        <p className="font-bold text-charcoal-900">Where should we deliver?</p>
        <p className="mt-1 text-sm text-charcoal-700">Pick your area and we&apos;ll show the kitchens that deliver to you.</p>
        <div className="mt-3">
          <ZonePicker zones={zones} />
        </div>
      </section>
    );
  }

  const picks = restaurants
    .filter((r) => r.zoneId === zone.id)
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen))
    .slice(0, 8);

  if (picks.length === 0) {
    return (
      <p className="mt-8 rounded-2xl bg-white px-4 py-3 text-sm text-charcoal-700 shadow-card">
        We don&apos;t have restaurants in {zone.name} yet. Tap the area at the top to try another.
      </p>
    );
  }

  return (
    <section aria-labelledby="picks-heading" className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 id="picks-heading" className="text-xl font-extrabold tracking-tight text-charcoal-900">
          Near you in {zone.name}
        </h2>
        <Link href="/restaurants" className="text-sm font-bold text-brand-700">See all</Link>
      </div>
      <ul className="no-scrollbar relative -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-3">
        {picks.map((r) => (
          <li key={r.slug} className="w-64 shrink-0">
            <Link
              href={`/restaurants/${r.slug}`}
              className="block overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card"
            >
              <RestaurantBanner cuisine={r.cuisine} imageUrl={r.imageUrl} dimmed={!r.isOpen} />
              <div className="p-3">
                <p className="truncate font-bold text-charcoal-900">{r.name}</p>
                <p className="truncate text-sm text-charcoal-700">{r.cuisine} · {r.isOpen ? "Open" : "Closed"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-charcoal-800">
                  <RatingBadge avg={r.ratingAvg} count={r.ratingCount} />
                  <span className="rounded-full bg-brand-100 px-2 py-0.5">~{r.etaMinutes} min</span>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5">{formatPKR(r.deliveryFeePkr)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}