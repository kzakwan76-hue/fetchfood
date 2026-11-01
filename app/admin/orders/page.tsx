import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, OrderRows, type OrderRow } from "../../../components/admin-ui";
import { requireAdmin } from "../../../lib/admin";
import { STATUS_LABEL } from "../../../lib/order-status";

export const metadata = { title: "Orders" };

const FILTERS = ["placed", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];
const chip = "whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold";

export default function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return (
    <AdminPage title="All orders">
      <Orders searchParams={searchParams} />
    </AdminPage>
  );
}

async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await connection();
  const { status } = await searchParams;
  const filter = status && FILTERS.includes(status) ? status : null;
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_orders", { p_status: filter, p_limit: 100 });

  return (
    <>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        <Link href="/admin/orders" className={`${chip} ${filter === null ? "border-charcoal-900 bg-charcoal-900 text-white" : "border-neutral-300 bg-white"}`}>
          All
        </Link>
        {FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`${chip} ${filter === s ? "border-charcoal-900 bg-charcoal-900 text-white" : "border-neutral-300 bg-white"}`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-600">Latest 100.</p>
      <OrderRows rows={(data ?? []) as OrderRow[]} />
    </>
  );
}