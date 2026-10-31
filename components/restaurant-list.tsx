"use client";

import Link from "next/link";
import type { Restaurant } from "../lib/catalog";
import { formatPKR } from "../lib/pk";
import { useZone } from "../lib/zone-store";
import { ZonePicker, type ZoneOption } from "./zone-picker";

export function RestaurantList({
  restaurants,
  zones,
}: {
  restaurants: Restaurant[];
  zones: ZoneOption[];
}) {
  const chosen = useZone();
  const zone = zones.find((z) => z.id === chosen?.id) ?? null;
  const visible = zone ? restaurants.filter((r) => r.zoneId === zone.id) : [];

  return (
    <>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <ZonePicker zones={zones} />
      </div>

      {zone && visible.length === 0 && (
        <p className="mt-6 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          We don&apos;t have restaurants in {zone.name} yet. Try another area.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {visible.map((r) => (
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
    </>
  );
}