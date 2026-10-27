import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { formatPKR } from "../../lib/pk";
import { ACTIVE_STATUSES, STATUS_LABEL, formatOrderTime } from "../../lib/order-status";
import { OrderActions } from "../../components/order-actions";
import { RefreshButton } from "../../components/refresh-button";
import { RestaurantOpenToggle } from "../../components/restaurant-open-toggle";

type OrderRow = {
  id: string;
  rider_id: string | null;
  status: string;
  total_pkr: number;
  delivery_address: string;
  phone: string;
  note: string | null;
  created_at: string;
  restaurants: { name: string } | null;
  order_items: { item_name: string; quantity: number }[];
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between text-sm font-semibold text-brand-600">
        <Link href="/account">← Account</Link>
        <Link href="/dashboard/menu">Manage menu →</Link>
      </div>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Restaurant dashboard</h1>
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // Only restaurants this user owns. (RLS would also let a customer see their OWN orders,
  // so we filter by restaurant below to keep this a kitchen view.)
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, is_open")
    .eq("owner_id", claimsData.claims.sub)
    .order("name");

  if (!restaurants?.length) {
    return (
      <p className="mt-6 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
        You don&apos;t own a restaurant yet. Ask an admin to link your account to one.
      </p>
    );
  }

  const { data } = await supabase
    .from("orders")
    .select(
      "id, rider_id, status, total_pkr, delivery_address, phone, note, created_at, restaurants(name), order_items(item_name, quantity)",
    )
    .in("restaurant_id", restaurants.map((r) => r.id))
    .order("created_at", { ascending: false })
    .limit(50);
  const orders = (data ?? []) as unknown as OrderRow[];
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).reverse(); // oldest first
  const finished = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status)).slice(0, 10);

  return (
    <div className="mt-4 space-y-6">
      <div className="space-y-3">
        {restaurants.map((r) => (
          <RestaurantOpenToggle key={r.id} restaurantId={r.id} name={r.name} isOpen={r.is_open} />
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Active orders ({active.length})</h2>
          <RefreshButton />
        </div>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No active orders right now.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {active.map((o) => (
              <li key={o.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-neutral-900">
                    #{o.id.slice(0, 8)} · {formatOrderTime(o.created_at)}
                  </p>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                {restaurants.length > 1 && (
                  <p className="text-sm text-neutral-600">{o.restaurants?.name}</p>
                )}
                <ul className="mt-2 text-sm text-neutral-800">
                  {o.order_items.map((i) => (
                    <li key={i.item_name}>
                      {i.quantity} × {i.item_name}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-neutral-700">{o.delivery_address}</p>
                <p className="text-sm text-neutral-700">
                  <a href={`tel:${o.phone}`} className="font-semibold text-brand-600">
                    {o.phone}
                  </a>
                </p>
                {o.note && <p className="text-sm text-neutral-700">Note: {o.note}</p>}
                <p className="mt-1 text-sm font-semibold text-neutral-900">Cash to collect: {formatPKR(o.total_pkr)}</p>
                <OrderActions orderId={o.id} status={o.status} hasRider={o.rider_id !== null} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-900">Recently finished</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
            {finished.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span>
                  #{o.id.slice(0, 8)} · {formatOrderTime(o.created_at)}
                </span>
                <span className="text-neutral-600">
                  {STATUS_LABEL[o.status] ?? o.status} · {formatPKR(o.total_pkr)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}