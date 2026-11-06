import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminPage, Line, StatusPill, card } from "../../../../components/admin-ui";
import { requireAdmin } from "../../../../lib/admin";
import { formatOrderTime } from "../../../../lib/order-status";
import { formatPKR } from "../../../../lib/pk";

type D = {
  d_id: string; d_created: string; d_status: string; d_ready: string | null; d_delivered: string | null;
  d_restaurant: string; d_restaurant_id: string; d_customer: string; d_customer_email: string | null;
  d_phone: string; d_address: string; d_note: string | null; d_items: string | null;
  d_subtotal: number; d_fee: number; d_total: number;
  d_rider: string | null; d_rider_email: string | null; d_rider_id: string | null;
  d_bps: number | null; d_commission: number | null; d_rest_share: number | null;
  d_rider_pay: number | null; d_platform_fee: number | null;
};

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AdminPage title="Order" back={{ href: "/admin/orders", label: "All orders" }}>
      <Detail params={params} />
    </AdminPage>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_order_detail", { p_id: id });
  const d = ((data ?? []) as D[])[0];
  if (!d) notFound();
  const { data: called } = await supabase.rpc("admin_order_call", { p_id: id });
  const { data: locData } = await supabase.rpc("admin_order_location", { p_id: id });
  const loc = ((locData ?? []) as { l_lat: number | null; l_lng: number | null }[])[0];
  const { data: modeData } = await supabase.rpc("admin_order_mode", { p_id: id });
  const mode = ((modeData ?? []) as { m_mode: string; m_dispatched: string | null }[])[0];
  const own = mode?.m_mode === "own";

  return (
    <div className="mt-4 space-y-4">
      <div className={card}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-charcoal-900">#{d.d_id.slice(0, 8)}</p>
          <StatusPill status={d.d_status} />
        </div>
        <dl className="mt-2">
          <Line label="Placed" value={formatOrderTime(d.d_created)} />
          {own ? (
            <Line
              label="Marked out for delivery by the restaurant"
              value={mode?.m_dispatched ? formatOrderTime(mode.m_dispatched) : "not yet"}
            />
          ) : (
            <>
              <Line label="Ready for pickup" value={d.d_ready ? formatOrderTime(d.d_ready) : "not yet"} />
              <Line label="Rider called customer" value={called ? formatOrderTime(String(called)) : "not recorded"} />
            </>
          )}
          <Line label="Delivered" value={d.d_delivered ? formatOrderTime(d.d_delivered) : "not yet"} />
          <Line
            label="Restaurant"
            value={<Link href={`/admin/restaurants/${d.d_restaurant_id}`} className="font-semibold text-brand-700 underline">{d.d_restaurant}</Link>}
          />
          <Line
            label="Delivered by"
            value={
              own ? (
                "the restaurant's own rider"
              ) : d.d_rider_id ? (
                <Link href={`/admin/riders/${d.d_rider_id}`} className="font-semibold text-brand-700 underline">
                  {d.d_rider ?? d.d_rider_email}
                </Link>
              ) : (
                "no rider yet"
              )
            }
          />
        </dl>
      </div>

      <div className={card}>
        <p className="font-bold text-charcoal-900">Customer</p>
        <p className="mt-1">{d.d_customer}{d.d_customer_email ? ` · ${d.d_customer_email}` : ""}</p>
        <p>{d.d_phone}</p>
        <p className="mt-1">{d.d_address}</p>
        {loc?.l_lat != null && loc?.l_lng != null ? (
          <p className="mt-1">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${loc.l_lat},${loc.l_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline"
            >
              📍 Open the customer&apos;s pin
            </a>
          </p>
        ) : (
          <p className="mt-1 text-neutral-600">No map pin dropped.</p>
        )}
        {d.d_note && <p className="mt-1 text-neutral-700">Note: {d.d_note}</p>}
        <p className="mt-2 font-semibold text-charcoal-900">Items</p>
        <p>{d.d_items ?? "none"}</p>
      </div>

      <div className={card}>
        <p className="font-bold text-charcoal-900">Money</p>
        <dl className="mt-1">
          <Line label="Food subtotal" value={formatPKR(d.d_subtotal)} />
          <Line label="Delivery fee" value={formatPKR(d.d_fee)} />
          <Line label="Customer pays (cash)" value={formatPKR(d.d_total)} bold />
        </dl>
        {d.d_delivered && d.d_commission !== null ? (
          own ? (
            <dl className="mt-3 border-t border-neutral-200 pt-2">
              <Line label={`Commission the restaurant owes us (${((d.d_bps ?? 0) / 100).toString()}%, own-rider rate)`} value={formatPKR(d.d_commission)} bold />
              <Line label="Restaurant keeps" value={formatPKR(d.d_total - d.d_commission)} />
              <p className="mt-1 text-neutral-600">The restaurant&apos;s rider collected the cash, and the delivery fee stays with the restaurant.</p>
            </dl>
          ) : (
            <dl className="mt-3 border-t border-neutral-200 pt-2">
              <Line label={`Commission (${((d.d_bps ?? 0) / 100).toString()}%)`} value={formatPKR(d.d_commission)} />
              <Line label="Owed to restaurant" value={formatPKR(d.d_rest_share ?? 0)} />
              <Line label="Rider keeps" value={formatPKR(d.d_rider_pay ?? 0)} />
              <Line label="FetchFood delivery cut" value={formatPKR(d.d_platform_fee ?? 0)} />
              <Line label="FetchFood earns" value={formatPKR(d.d_commission + (d.d_platform_fee ?? 0))} bold />
              <Line label="Rider hands in" value={formatPKR(d.d_total - (d.d_rider_pay ?? 0))} />
            </dl>
          )
        ) : (
          <p className="mt-2 text-neutral-600">
            {own
              ? "The money breakdown is written when the restaurant marks the order delivered."
              : "The money breakdown is written when the rider marks the order delivered."}
          </p>
        )}
      </div>
    </div>
  );
}