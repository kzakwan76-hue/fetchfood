import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { formatPKR } from "../../lib/pk";
import { formatOrderTime } from "../../lib/order-status";
import { RefreshButton } from "../../components/refresh-button";
import { RiderButton } from "../../components/rider-button";
import { ListSkeleton } from "../../components/skeleton";

type Available = {
  o_id: string;
  o_restaurant: string;
  o_area: string;
  o_total: number;
  o_created: string;
};
type Mine = Available & {
  o_status: string;
  o_address: string;
  o_phone: string;
  o_note: string | null;
  o_items: string | null;
};

export default function RiderPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/account" className="text-sm font-semibold text-brand-700">
        ← Account
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Rider deliveries</h1>
      <Suspense fallback={<ListSkeleton rows={3} height="h-32" />}>
        <RiderContent />
      </Suspense>
    </main>
  );
}

async function RiderContent() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // UI hint only: every rider function checks the role again in the database.
  const { data: me } = await supabase
    .from("profiles")
    .select("role, zone_id")
    .eq("id", claimsData.claims.sub)
    .single();
  if (me?.role !== "rider") notFound();

  if (!me.zone_id) {
    return (
      <div className="mt-6 rounded-3xl border border-brand-200 bg-white p-6 shadow-card">
        <p className="font-bold text-charcoal-900">You don&apos;t have a delivery zone yet</p>
        <p className="mt-1 text-sm text-charcoal-700">
          Riders only see orders from restaurants in their own zone. Ask an admin to assign you one, then
          refresh this page.
        </p>
        <div className="mt-3">
          <RefreshButton />
        </div>
      </div>
    );
  }

  const { data: zone } = await supabase.from("zones").select("name").eq("id", me.zone_id).maybeSingle();
  const { data: availableData } = await supabase.rpc("rider_available_orders");
  const { data: mineData } = await supabase.rpc("rider_my_orders");
  const available = (availableData ?? []) as Available[];
  const mine = (mineData ?? []) as Mine[];
  const active = mine.filter((o) => o.o_status === "out_for_delivery");
  const done = mine.filter((o) => o.o_status === "delivered").slice(0, 5);

  return (
    <div className="mt-4 space-y-8">
      <p className="text-sm text-neutral-700">
        Your zone: <strong>{zone?.name ?? "unknown"}</strong>
      </p>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">My active deliveries ({active.length})</h2>
          <RefreshButton />
        </div>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">Nothing on your bike right now.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {active.map((o) => (
              <li key={o.o_id} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
                <p className="font-semibold text-neutral-900">
                  #{o.o_id.slice(0, 8)} · {o.o_restaurant} ({o.o_area})
                </p>
                {o.o_items && <p className="mt-1 text-neutral-800">{o.o_items}</p>}
                <p className="mt-2 text-neutral-700">{o.o_address}</p>
                <p className="text-neutral-700">
                  <a href={`tel:${o.o_phone}`} className="font-semibold text-brand-700">
                    {o.o_phone}
                  </a>
                </p>
                {o.o_note && <p className="text-neutral-700">Note: {o.o_note}</p>}
                <p className="mt-1 font-semibold text-neutral-900">Cash to collect: {formatPKR(o.o_total)}</p>
                <div className="flex flex-wrap gap-2">
                  <RiderButton orderId={o.o_id} intent="deliver" label="Mark delivered" />
                  <RiderButton
                    orderId={o.o_id}
                    intent="release"
                    label="Release order"
                    confirmText="Give this order back so another rider can take it?"
                    secondary
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Available to pick up ({available.length})</h2>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No orders are ready in your zone right now.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {available.map((o) => (
              <li key={o.o_id} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
                <p className="font-semibold text-neutral-900">
                  {o.o_restaurant} ({o.o_area}) · {formatOrderTime(o.o_created)}
                </p>
                <p className="text-neutral-700">Cash to collect: {formatPKR(o.o_total)}</p>
                <p className="text-neutral-600">The customer&apos;s address is shown after you take it.</p>
                <RiderButton orderId={o.o_id} intent="claim" label="Take this delivery" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-900">Recently delivered</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
            {done.map((o) => (
              <li key={o.o_id} className="flex justify-between gap-3 p-4 text-sm">
                <span>
                  #{o.o_id.slice(0, 8)} · {o.o_restaurant}
                </span>
                <span className="text-neutral-600">{formatPKR(o.o_total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}