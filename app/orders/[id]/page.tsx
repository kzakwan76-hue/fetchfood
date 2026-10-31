import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { formatPKR } from "../../../lib/pk";
import { ACTIVE_STATUSES, STATUS_LABEL, STATUS_TONE } from "../../../lib/order-status";
import { CancelOrderButton } from "../../../components/cancel-order-button";
import { ClearCart } from "../../../components/clear-cart";
import { OrderTimeline } from "../../../components/order-timeline";
import { RefreshButton } from "../../../components/refresh-button";
import { Skeleton } from "../../../components/skeleton";

type OrderRow = {
  id: string;
  status: string;
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  total_pkr: number;
  delivery_address: string;
  phone: string;
  note: string | null;
  created_at: string;
  restaurants: { name: string } | null;
  order_items: { item_name: string; unit_price_pkr: number; quantity: number }[];
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
};

export default function OrderPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      <Link href="/orders" className="text-sm font-semibold text-brand-700">
        ← My orders
      </Link>
      <Suspense
        fallback={
          <div className="mt-4 space-y-4" role="status" aria-label="Loading order">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <OrderDetails params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OrderDetails({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { placed } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // RLS: only returns the order if it belongs to the logged-in user (or their restaurant).
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, subtotal_pkr, delivery_fee_pkr, total_pkr, delivery_address, phone, note, created_at, restaurants(name), order_items(item_name, unit_price_pkr, quantity)",
    )
    .eq("id", id)
    .maybeSingle();
  const order = data as unknown as OrderRow | null;
  if (!order) notFound();

  return (
    <div className="mt-4 space-y-4">
      {placed === "1" && <ClearCart />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-900">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-charcoal-700">From {order.restaurants?.name ?? "restaurant"}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[order.status] ?? "bg-neutral-200 text-neutral-700"}`}
        >
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {placed === "1" && (
        <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Order placed! The restaurant has been told.
        </p>
      )}

      <OrderTimeline status={order.status} />
      {ACTIVE_STATUSES.includes(order.status) && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-charcoal-700">This page checks for updates every 30 seconds.</p>
          <RefreshButton />
        </div>
      )}
      {order.status === "placed" && <CancelOrderButton orderId={order.id} />}

      <ul className="divide-y divide-brand-100 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
        {order.order_items.map((item) => (
          <li key={item.item_name} className="flex justify-between gap-3 p-4">
            <span>
              {item.quantity} × {item.item_name}
            </span>
            <span className="font-semibold">{formatPKR(item.unit_price_pkr * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-1.5 rounded-3xl border border-brand-200 bg-white p-4 text-sm shadow-card">
        <div className="flex justify-between">
          <dt className="text-charcoal-700">Subtotal</dt>
          <dd>{formatPKR(order.subtotal_pkr)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-700">Delivery fee</dt>
          <dd>{formatPKR(order.delivery_fee_pkr)}</dd>
        </div>
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-bold text-charcoal-900">
          <dt>Pay the rider (cash)</dt>
          <dd>{formatPKR(order.total_pkr)}</dd>
        </div>
      </dl>

      <div className="rounded-3xl border border-brand-200 bg-white p-4 text-sm text-charcoal-800 shadow-card">
        <p className="font-semibold text-charcoal-900">Delivering to</p>
        <p className="mt-1">{order.delivery_address}</p>
        <p className="text-charcoal-700">{order.phone}</p>
        {order.note && <p className="mt-2 text-charcoal-700">Note: {order.note}</p>}
      </div>
    </div>
  );
}