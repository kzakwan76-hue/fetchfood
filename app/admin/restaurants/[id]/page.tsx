import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminPage, Line, OrderRows, card, type OrderRow } from "../../../../components/admin-ui";
import { CommissionForm } from "../../../../components/money-forms";
import { requireAdmin } from "../../../../lib/admin";
import { formatPKR } from "../../../../lib/pk";
import type { RestRow } from "../page";

export default function AdminRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AdminPage title="Restaurant" back={{ href: "/admin/restaurants", label: "All restaurants" }}>
      <Detail params={params} />
    </AdminPage>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_restaurants", { p_id: id });
  const r = ((data ?? []) as RestRow[])[0];
  if (!r) notFound();
  const { data: orders } = await supabase.rpc("admin_orders", { p_restaurant: id, p_limit: 50 });

  return (
    <div className="mt-4 space-y-4">
      <div className={card}>
        <p className="text-lg font-bold text-charcoal-900">{r.s_name}</p>
        <dl className="mt-1">
          <Line label="Address" value={`${r.s_area} (/${r.s_slug})`} />
          <Line label="Zone" value={r.s_zone ?? "none"} />
          <Line label="Owner" value={r.s_owner ?? "none"} />
          <Line label="Status" value={r.s_open ? "open" : "closed"} />
          <Line label="Delivered orders" value={r.s_orders} />
          <Line label="Food sales" value={formatPKR(r.s_sales)} />
          <Line label="Commission earned" value={formatPKR(r.s_commission)} />
          <Line label="Paid to restaurant" value={formatPKR(r.s_paid)} />
          <Line label="We owe them" value={formatPKR(r.s_owed)} bold />
        </dl>
      </div>
      <div className={card}>
        <p className="font-bold text-charcoal-900">Commission rate</p>
        <CommissionForm restaurantId={r.s_id} customPct={r.s_custom ? r.s_bps / 100 : null} currentPct={r.s_bps / 100} />
      </div>
      <h2 className="text-lg font-bold text-charcoal-900">Their orders</h2>
      <OrderRows rows={(orders ?? []) as OrderRow[]} />
    </div>
  );
}