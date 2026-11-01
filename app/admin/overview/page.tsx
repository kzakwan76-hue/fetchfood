import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, Stat } from "../../../components/admin-ui";
import { requireAdmin } from "../../../lib/admin";
import { formatPKR } from "../../../lib/pk";

export const metadata = { title: "Overview" };

type Ov = {
  ov_orders_today: number; ov_delivered_today: number; ov_active: number; ov_sales_today: number;
  ov_revenue: number; ov_owed: number; ov_cash: number; ov_restaurants: number; ov_riders: number;
};

export default function OverviewPage() {
  return (
    <AdminPage title="Overview">
      <Overview />
    </AdminPage>
  );
}

async function Overview() {
  await connection();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_overview");
  const o = ((data ?? []) as Ov[])[0];
  if (!o) return <p className="mt-4 text-sm text-neutral-600">No data.</p>;

  return (
    <div className="mt-4 space-y-5">
      <p className="text-xs text-neutral-600">&ldquo;Today&rdquo; is Pakistan time. Money figures count orders delivered after the ledger was added.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Orders today" value={String(o.ov_orders_today)} />
        <Stat label="Delivered today" value={String(o.ov_delivered_today)} />
        <Stat label="Active right now" value={String(o.ov_active)} />
        <Stat label="Sales delivered today" value={formatPKR(o.ov_sales_today)} />
        <Stat label="FetchFood revenue (all time)" value={formatPKR(o.ov_revenue)} />
        <Stat label="We owe restaurants" value={formatPKR(o.ov_owed)} warn={o.ov_owed > 0} />
        <Stat label="Riders hold (cash)" value={formatPKR(o.ov_cash)} warn={o.ov_cash > 0} />
        <Stat label="Restaurants" value={String(o.ov_restaurants)} />
        <Stat label="Riders" value={String(o.ov_riders)} />
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-brand-700">
        <Link href="/admin/orders">All orders →</Link>
        <Link href="/admin/money">Settle up →</Link>
      </div>
    </div>
  );
}