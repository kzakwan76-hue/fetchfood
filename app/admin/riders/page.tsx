import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, card } from "../../../components/admin-ui";
import { requireAdmin } from "../../../lib/admin";
import { formatPKR } from "../../../lib/pk";

export const metadata = { title: "Riders" };

export type RiderRow = {
  r_id: string; r_email: string; r_name: string | null; r_phone: string | null; r_zone: string | null;
  r_delivered: number; r_active: number; r_held: number; r_owed: number;
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
  const [{ data }, { data: apps }] = await Promise.all([
    supabase.rpc("admin_riders"),
    supabase.rpc("admin_rider_applications"),
  ]);
  const riders = (data ?? []) as RiderRow[];
  const pending = ((apps ?? []) as { a_status: string }[]).filter((a) => a.a_status === "pending").length;

  return (
    <>
      <Link href="/admin/riders/applications" className={`${card} mt-4 block font-semibold hover:border-brand-500 ${pending > 0 ? "border-amber-300 bg-amber-50" : ""}`}>
        Applications waiting for review: {pending} →
      </Link>
      {riders.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">No approved riders yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {riders.map((r) => (
            <li key={r.r_id}>
              <Link href={`/admin/riders/${r.r_id}`} className={`${card} block hover:border-brand-500`}>
                <p className="font-bold text-charcoal-900">{r.r_name ?? "No name"}</p>
                <p className="text-neutral-700">{r.r_email} · {r.r_phone ?? "no phone"}</p>
                <p className="text-neutral-700">Zone: {r.r_zone ?? "none (sees no orders)"}</p>
                <p className="mt-1 text-neutral-800">
                  {r.r_delivered} delivered · {r.r_active} on the road · holds <strong>{formatPKR(r.r_held)}</strong> · we owe {formatPKR(r.r_owed)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}