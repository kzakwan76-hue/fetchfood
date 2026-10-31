"use client";

import Link from "next/link";
import type { Restaurant } from "../lib/catalog";
import { formatPKR } from "../lib/pk";
import { useHydrated, useZone } from "../lib/zone-store";
import { RatingBadge } from "./rating-badge";
import { RestaurantBanner } from "./restaurant-banner";
import { ListSkeleton } from "./skeleton";
import { ZonePicker, type ZoneOption } from "./zone-picker";

export function RestaurantList({
  restaurants,
  zones,
}: {
  restaurants: Restaurant[];
  zones: ZoneOption[];
}) {
  const hydrated = useHydrated();
  const chosen = useZone();
  const zone = zones.find((z) => z.id === chosen?.id) ?? null;
  const visible = zone ? restaurants.filter((r) => r.zoneId === zone.id) : [];

  return (
    <>
      <div className="mt-4 rounded-3xl border border-brand-200 bg-white p-4 shadow-card">
        <ZonePicker zones={zones} />
      </div>

      {!hydrated && <ListSkeleton rows={2} height="h-52" />}

      {hydrated && !zone && (
        <p className="mt-6 text-center text-sm text-charcoal-700">
          Pick your area above and we&apos;ll show the kitchens that deliver to you.
        </p>
      )}

      {hydrated && zone && visible.length === 0 && (
        <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm text-charcoal-700 shadow-card">
          We don&apos;t have restaurants in {zone.name} yet. Try another area.
        </p>
      )}

      <ul className="mt-6 space-y-5">
        {visible.map((r) => (
          <li key={r.slug} className="rise">
            <Link
              href={`/restaurants/${r.slug}`}
              className="block overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card motion-safe:transition motion-safe:hover:-translate-y-0.5 hover:shadow-lift"
            >
              <RestaurantBanner cuisine={r.cuisine} dimmed={!r.isOpen} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-charcoal-900">{r.name}</h2>
                  <span
                    className={
                      r.isOpen
                        ? "shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800"
                        : "shrink-0 rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700"
                    }
                  >
                    {r.isOpen ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-charcoal-700">
                  {r.cuisine} · {r.area}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-charcoal-800">
                  <RatingBadge avg={r.ratingAvg} count={r.ratingCount} />
                  <span className="rounded-full bg-brand-100 px-2.5 py-1">~{r.etaMinutes} min</span>
                  <span className="rounded-full bg-brand-100 px-2.5 py-1">
                    Delivery {formatPKR(r.deliveryFeePkr)}
                  </span>
                  <span className="rounded-full bg-brand-100 px-2.5 py-1">
                    Min {formatPKR(r.minOrderPkr)}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}