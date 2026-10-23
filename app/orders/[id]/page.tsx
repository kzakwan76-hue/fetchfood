import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { formatPKR } from "../../../lib/pk";
import { STATUS_LABEL } from "../../../lib/order-status";
import { CancelOrderButton } from "../../../components/cancel-order-button";
import { ClearCart } from "../../../components/clear-cart";

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
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/orders" className="text-sm font-semibold text-brand-600">
        ← My orders
      </Link>
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
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
    <div className="mt-3 space-y-4">
      {placed === "1" && <ClearCart />}
      <h1 className="text-2xl font-bold text-neutral-900">Order #{order.id.slice(0, 8)}</h1>
      <p
        className={
          order.status === "cancelled"
            ? "rounded-lg bg-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800"
            : "rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800"
        }
      >
        {STATUS_LABEL[order.status] ?? order.status}
      </p>
      {order.status === "placed" && <CancelOrderButton orderId={order.id} />}
      <p className="text-sm text-neutral-600">From {order.restaurants?.name ?? "restaurant"}</p>

      <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
        {order.order_items.map((item) => (
          <li key={item.item_name} className="flex justify-between gap-3 p-4">
            <span>
              {item.quantity} × {item.item_name}
            </span>
            <span className="font-medium">{formatPKR(item.unit_price_pkr * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd>{formatPKR(order.subtotal_pkr)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-600">Delivery fee</dt>
          <dd>{formatPKR(order.delivery_fee_pkr)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-neutral-900">
          <dt>Pay the rider (cash)</dt>
          <dd>{formatPKR(order.total_pkr)}</dd>
        </div>
      </dl>

      <p className="text-sm text-neutral-700">
        Delivering to: {order.delivery_address} · {order.phone}
      </p>
      {order.note && <p className="text-sm text-neutral-700">Note: {order.note}</p>}
    </div>
  );
}