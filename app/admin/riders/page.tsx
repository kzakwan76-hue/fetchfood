import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, card } from "../../../components/admin-ui";
import { requireAdmin } from "../../../lib/admin";
import { formatPKR } from "../../../lib/pk";

export const metadata = { title: "Riders" };

export type RiderRow = {
  r_id: string; r_email: string; r_name: string | null; r_phone: string | null; r_zone: string | null;
  r_delivered: number; r_active: number; r_held: number;
};

export default function AdminRidersPage() {
  return (
    <AdminPage title="Riders">
      <Riders />
    </AdminPage>
  );
}

async function Riders() {
  await connection();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_riders");
  const riders = (data ?? []) as RiderRow[];
  if (riders.length === 0) return <p className="mt-4 text-sm text-neutral-600">No riders yet. Set a role in Setup.</p>;

  return (
    <ul className="mt-4 space-y-3">
      {riders.map((r) => (
        <li key={r.r_id}>
          <Link href={`/admin/riders/${r.r_id}`} className={`${card} block hover:border-brand-500`}>
            <p className="font-bold text-charcoal-900">{r.r_name ?? "No name"}</p>
            <p className="text-neutral-700">{r.r_email} · {r.r_phone ?? "no phone"}</p>
            <p className="text-neutral-700">Zone: {r.r_zone ?? "none (sees no orders)"}</p>
            <p className="mt-1 text-neutral-800">
              {r.r_delivered} delivered · {r.r_active} on the road · holds{" "}
              <strong>{formatPKR(r.r_held)}</strong>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}