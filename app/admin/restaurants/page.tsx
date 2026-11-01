import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, card } from "../../../components/admin-ui";
import { requireAdmin } from "../../../lib/admin";
import { formatPKR } from "../../../lib/pk";

export const metadata = { title: "Restaurants" };

export type RestRow = {
  s_id: string; s_slug: string; s_name: string; s_area: string; s_owner: string | null; s_zone: string | null;
  s_open: boolean; s_bps: number; s_custom: boolean; s_orders: number; s_sales: number;
  s_commission: number; s_paid: number; s_owed: number;
};

export default function AdminRestaurantsPage() {
  return (
    <AdminPage title="Restaurants">
      <Restaurants />
    </AdminPage>
  );
}

async function Restaurants() {
  await connection();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_restaurants");
  const rows = (data ?? []) as RestRow[];

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((r) => (
        <li key={r.s_id}>
          <Link href={`/admin/restaurants/${r.s_id}`} className={`${card} block hover:border-brand-500`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-charcoal-900">{r.s_name}</p>
              <span className="text-xs font-semibold text-neutral-700">{r.s_open ? "open" : "closed"}</span>
            </div>
            <p className="text-neutral-700">{r.s_area} · {r.s_zone ?? "no zone"} · {r.s_owner ?? "no owner"}</p>
            <p className="mt-1 text-neutral-800">
              {r.s_orders} delivered · sales {formatPKR(r.s_sales)} · commission {(r.s_bps / 100).toString()}%
              {r.s_custom ? " (custom)" : ""} · we owe <strong>{formatPKR(r.s_owed)}</strong>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}