import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, card } from "../../../../components/admin-ui";
import { requireAdmin } from "../../../../lib/admin";
import { formatOrderTime } from "../../../../lib/order-status";

export const metadata = { title: "Rider applications" };

type App = { a_id: string; a_name: string; a_email: string; a_status: string; a_submitted: string };

export default function ApplicationsPage() {
  return (
    <AdminPage title="Rider applications" back={{ href: "/admin/riders", label: "Riders" }}>
      <Applications />
    </AdminPage>
  );
}

async function Applications() {
  await connection();
  const supabase = await requireAdmin();
  const { data } = await supabase.rpc("admin_rider_applications");
  const apps = (data ?? []) as App[];
  if (apps.length === 0) return <p className="mt-4 text-sm text-neutral-600">No applications yet.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {apps.map((a) => (
        <li key={a.a_id}>
          <Link href={`/admin/riders/${a.a_id}`} className={`${card} block hover:border-brand-500`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-charcoal-900">{a.a_name}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${a.a_status === "pending" ? "bg-amber-100 text-amber-900" : "bg-neutral-100 text-neutral-700"}`}>{a.a_status}</span>
            </div>
            <p className="text-neutral-700">{a.a_email} · sent {formatOrderTime(a.a_submitted)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}