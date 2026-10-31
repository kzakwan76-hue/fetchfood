import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { formatPKR } from "../../lib/pk";
import { STATUS_LABEL, STATUS_TONE, formatOrderTime } from "../../lib/order-status";
import { ListSkeleton } from "../../components/skeleton";

type Row = {
  id: string;
  status: string;
  total_pkr: number;
  created_at: string;
  restaurants: { name: string } | null;
};

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-700">
        ← Restaurants
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-charcoal-900">My orders</h1>
      <Suspense fallback={<ListSkeleton rows={3} height="h-20" />}>
        <OrderList />
      </Suspense>
    </main>
  );
}

async function OrderList() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // Only orders this user PLACED (an owner would otherwise also see their restaurant's orders).
  const { data } = await supabase
    .from("orders")
    .select("id, status, total_pkr, created_at, restaurants(name)")
    .eq("customer_id", claimsData.claims.sub)
    .order("created_at", { ascending: false })
    .limit(30);
  const orders = (data ?? []) as unknown as Row[];

  if (orders.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-brand-200 bg-white p-6 text-center shadow-card">
        <p className="font-bold text-charcoal-900">No orders yet</p>
        <p className="mt-1 text-sm text-charcoal-700">When you order, you can follow it here.</p>
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
    <ul className="mt-4 space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/orders/${o.id}`}
            className="flex items-center justify-between gap-3 rounded-3xl border border-brand-200 bg-white p-4 shadow-card hover:shadow-lift"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-charcoal-900">{o.restaurants?.name ?? "Restaurant"}</p>
              <p className="text-sm text-charcoal-700">
                #{o.id.slice(0, 8)} · {formatOrderTime(o.created_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold text-charcoal-900">{formatPKR(o.total_pkr)}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[o.status] ?? "bg-neutral-200 text-neutral-700"}`}
              >
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}