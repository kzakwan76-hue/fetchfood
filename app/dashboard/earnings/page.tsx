import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ListSkeleton } from "../../../components/skeleton";
import { formatOrderTime } from "../../../lib/order-status";
import { formatPKR } from "../../../lib/pk";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Earnings" };

type Row = {
  e_restaurant_id: string; e_name: string; e_orders: number; e_sales: number;
  e_commission: number; e_paid: number; e_owed: number; e_bps: number;
  e_owes_us: number; e_own: boolean; e_own_orders: number; e_remitted: number;
};
type Payout = { amount_pkr: number; note: string | null; created_at: string; restaurants: { name: string } | null };

export default function EarningsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Earnings</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Counts delivered orders. FetchFood records each payment when it sends or receives it.
      </p>
      <Suspense fallback={<ListSkeleton rows={2} height="h-40" />}>
        <Earnings />
      </Suspense>
    </main>
  );
}

async function Earnings() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data } = await supabase.rpc("owner_earnings");
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p className="mt-6 text-sm text-neutral-700">You don&apos;t own a restaurant yet.</p>;

  const { data: pay } = await supabase
    .from("restaurant_payouts")
    .select("amount_pkr, note, created_at, restaurants(name)")
    .order("created_at", { ascending: false })
    .limit(15);
  const payouts = (pay ?? []) as unknown as Payout[];

  return (
    <div className="mt-4 space-y-4">
      {rows.map((r) => (
        <section key={r.e_restaurant_id} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
          <h2 className="text-lg font-semibold text-neutral-900">{r.e_name}</h2>
          {r.e_own && (
            <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              Delivered by your own riders: you keep the cash and the delivery fee, and owe FetchFood a lower commission.
            </p>
          )}
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between"><dt className="text-neutral-600">Delivered orders</dt><dd>{r.e_orders}</dd></div>
            {r.e_own_orders > 0 && (
              <div className="flex justify-between"><dt className="text-neutral-600">Delivered by your own riders</dt><dd>{r.e_own_orders}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-neutral-600">Food sales</dt><dd>{formatPKR(r.e_sales)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-600">FetchFood commission now ({(r.e_bps / 100).toString()}%)</dt><dd>− {formatPKR(r.e_commission)} so far</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-600">Already paid to you</dt><dd>{formatPKR(r.e_paid)}</dd></div>
            {r.e_remitted > 0 && (
              <div className="flex justify-between"><dt className="text-neutral-600">You have paid FetchFood</dt><dd>{formatPKR(r.e_remitted)}</dd></div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-1 text-base font-bold text-neutral-900"><dt>We owe you</dt><dd>{formatPKR(r.e_owed)}</dd></div>
            {r.e_owes_us > 0 && (
              <div className="flex justify-between text-base font-bold text-red-700"><dt>You owe FetchFood</dt><dd>{formatPKR(r.e_owes_us)}</dd></div>
            )}
          </dl>
        </section>
      ))}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Recent payments to you</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white text-sm">
          {payouts.map((p, i) => (
            <li key={i} className="flex justify-between gap-3 p-3">
              <span>{p.restaurants?.name}{p.note ? ` · ${p.note}` : ""}</span>
              <span className="shrink-0">{formatPKR(p.amount_pkr)} · {formatOrderTime(p.created_at)}</span>
            </li>
          ))}
          {payouts.length === 0 && <li className="p-3 text-neutral-600">No payments yet.</li>}
        </ul>
      </section>
    </div>
  );
}