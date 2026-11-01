import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminPage, Line, OrderRows, card, type OrderRow } from "../../../../components/admin-ui";
import { requireAdmin } from "../../../../lib/admin";
import { formatPKR } from "../../../../lib/pk";
import type { RiderRow } from "../page";

export default function AdminRiderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AdminPage title="Rider" back={{ href: "/admin/riders", label: "All riders" }}>
      <Detail params={params} />
    </AdminPage>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_riders", { p_id: id });
  const r = ((data ?? []) as RiderRow[])[0];
  if (!r) notFound();
  const { data: orders } = await supabase.rpc("admin_orders", { p_rider: id, p_limit: 50 });

  return (
    <div className="mt-4 space-y-4">
      <div className={card}>
        <p className="text-lg font-bold text-charcoal-900">{r.r_name ?? "No name"}</p>
        <dl className="mt-1">
          <Line label="Email" value={r.r_email} />
          <Line label="Phone" value={r.r_phone ?? "none"} />
          <Line label="Zone" value={r.r_zone ?? "none"} />
          <Line label="Delivered" value={r.r_delivered} />
          <Line label="On the road now" value={r.r_active} />
          <Line label="Cash held (to deposit)" value={formatPKR(r.r_held)} bold />
        </dl>
        <p className="mt-2 text-xs text-neutral-600">Record a deposit on the Money page.</p>
      </div>
      <h2 className="text-lg font-bold text-charcoal-900">Their orders</h2>
      <OrderRows rows={(orders ?? []) as OrderRow[]} />
    </div>
  );
}