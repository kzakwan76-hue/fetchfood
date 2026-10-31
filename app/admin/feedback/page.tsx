import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ListSkeleton } from "../../../components/skeleton";
import { formatOrderTime } from "../../../lib/order-status";
import { createClient } from "../../../lib/supabase/server";

type Row = { f_id: string; f_kind: string; f_message: string; f_created: string; f_email: string | null };

export default function AdminFeedbackPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Feedback inbox</h1>
      <Suspense fallback={<ListSkeleton rows={3} height="h-24" />}>
        <Inbox />
      </Suspense>
    </main>
  );
}

async function Inbox() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // UI hint only: admin_list_feedback checks the role again in the database.
  const { data: me } = await supabase.from("profiles").select("role").eq("id", claimsData.claims.sub).single();
  if (me?.role !== "admin") notFound();

  const { data } = await supabase.rpc("admin_list_feedback");
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p className="mt-4 text-sm text-neutral-600">No feedback yet.</p>;

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((f) => (
        <li key={f.f_id} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
          <p className="flex justify-between gap-3">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold">{f.f_kind}</span>
            <span className="text-neutral-600">{formatOrderTime(f.f_created)}</span>
          </p>
          <p className="mt-2 whitespace-pre-wrap text-neutral-900">{f.f_message}</p>
          <p className="mt-1 text-xs text-neutral-600">{f.f_email ?? "unknown"}</p>
        </li>
      ))}
    </ul>
  );
}