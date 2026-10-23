import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { formatPKR } from "../../lib/pk";
import { STATUS_LABEL, formatOrderTime } from "../../lib/order-status";

type Row = {
  id: string;
  status: string;
  total_pkr: number;
  created_at: string;
  restaurants: { name: string } | null;
};

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-600">
        ← Restaurants
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">My orders</h1>
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
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
    return <p className="mt-6 text-neutral-700">You haven&apos;t placed an order yet.</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-neutral-50">
            <div>
              <p className="font-medium text-neutral-900">{o.restaurants?.name ?? "Restaurant"}</p>
              <p className="text-sm text-neutral-600">
                #{o.id.slice(0, 8)} · {formatOrderTime(o.created_at)}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-neutral-900">{formatPKR(o.total_pkr)}</p>
              <p className="text-neutral-600">{STATUS_LABEL[o.status] ?? o.status}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}