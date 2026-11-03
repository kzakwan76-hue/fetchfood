"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Restaurant } from "../lib/catalog";
import { formatPKR } from "../lib/pk";
import { useHydrated, useZone } from "../lib/zone-store";
import { openZoneIds } from "../app/customer/actions";
import { RatingBadge } from "./rating-badge";
import { RestaurantBanner } from "./restaurant-banner";
import { ListSkeleton } from "./skeleton";
import { ZonePicker, type ZoneOption } from "./zone-picker";

const chip = "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold";

export function RestaurantList({
  restaurants,
  zones,
}: {
  restaurants: Restaurant[];
  zones: ZoneOption[];
}) {
  const hydrated = useHydrated();
  const chosen = useZone();
  const [query, setQuery] = useState("");
  const [cuisineChoice, setCuisineChoice] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
    const [openZones, setOpenZones] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const ids = await openZoneIds();
      if (alive) setOpenZones(ids);
    };
    void load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const zone = zones.find((z) => z.id === chosen?.id) ?? null;
  const inZone = zone ? restaurants.filter((r) => r.zoneId === zone.id) : [];
  const cuisines = [...new Set(inZone.map((r) => r.cuisine))].sort();
  const cuisine = cuisineChoice && cuisines.includes(cuisineChoice) ? cuisineChoice : null;
  const q = query.trim().toLowerCase();
  const visible = inZone
    .filter(
      (r) =>
        (!cuisine || r.cuisine === cuisine) &&
        (!openOnly || r.isOpen) &&
        (!q || `${r.name} ${r.cuisine} ${r.area}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen)); // open kitchens first

  function clearFilters() {
    setQuery("");
    setCuisineChoice(null);
    setOpenOnly(false);
  }

  return (
    <>
      <div className="mt-4 rounded-3xl border border-brand-200 bg-white p-4 shadow-card">
        <ZonePicker zones={zones} />
      </div>

      {!hydrated && <ListSkeleton rows={2} height="h-52" />}
      {hydrated && zone && openZones !== null && !openZones.includes(zone.id) && (
        <p role="status" className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          🛵 No riders are on duty in {zone.name} right now, so ordering is paused. You can still browse. Check back soon.
        </p>
      )}

      {hydrated && !zone && (
        <p className="mt-6 text-center text-sm text-charcoal-700">
          Pick your area above and we&apos;ll show the kitchens that deliver to you.
        </p>
      )}

      {hydrated && zone && inZone.length === 0 && (
        <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm text-charcoal-700 shadow-card">
          We don&apos;t have restaurants in {zone.name} yet. Try another area.
        </p>
      )}

      {hydrated && zone && inZone.length > 0 && (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="sr-only">Search restaurants</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants or cuisines"
              className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-2.5 shadow-sm"
            />
          </label>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <button
              type="button"
              aria-pressed={openOnly}
              onClick={() => setOpenOnly((v) => !v)}
              className={`${chip} ${
                openOnly ? "border-green-600 bg-green-100 text-green-900" : "border-brand-200 bg-white text-charcoal-800"
              }`}
            >
              Open now
            </button>
            <button
              type="button"
              aria-pressed={cuisine === null}
              onClick={() => setCuisineChoice(null)}
              className={`${chip} ${
                cuisine === null ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 bg-white text-charcoal-800"
              }`}
            >
              All
            </button>
            {cuisines.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cuisine === c}
                onClick={() => setCuisineChoice(c)}
                className={`${chip} ${
                  cuisine === c ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 bg-white text-charcoal-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {hydrated && zone && inZone.length > 0 && visible.length === 0 && (
        <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm text-charcoal-700 shadow-card">
          No restaurants match.{" "}
          <button type="button" onClick={clearFilters} className="font-semibold text-brand-700 underline">
            Clear filters
          </button>
        </p>
      )}

      <ul className="mt-6 space-y-5">
        {visible.map((r) => (
          <li key={r.slug} className="rise">
            <Link
              href={`/restaurants/${r.slug}`}
              className="block overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card motion-safe:transition motion-safe:hover:-translate-y-0.5 hover:shadow-lift"
            >
              <RestaurantBanner cuisine={r.cuisine} imageUrl={r.imageUrl} dimmed={!r.isOpen} />
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