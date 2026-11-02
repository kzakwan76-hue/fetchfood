import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ListSkeleton } from "../../components/skeleton";
import { formatOrderTime } from "../../lib/order-status";
import { createClient } from "../../lib/supabase/server";
import { markAllRead } from "./actions";

export const metadata = { title: "Notifications" };

type Row = { id: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null };

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-4 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">Notifications</h1>
      <Suspense fallback={<ListSkeleton rows={3} height="h-20" />}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p className="mt-6 text-sm text-charcoal-700">Nothing yet. New orders, pickups and deliveries show up here.</p>;

  return (
    <>
      <form action={markAllRead} className="mt-3">
        <button type="submit" className="text-sm font-semibold text-brand-700 underline">Mark all as read</button>
      </form>
      <ul className="mt-3 space-y-3">
        {rows.map((n) => {
          const inner = (
            <>
              <p className="font-bold text-charcoal-900">{n.read_at ? "" : "● "}{n.title}</p>
              <p className="mt-0.5 text-sm text-charcoal-800">{n.body}</p>
              <p className="mt-1 text-xs text-charcoal-700">{formatOrderTime(n.created_at)}</p>
            </>
          );
          const cls = `block rounded-3xl border p-4 shadow-card ${n.read_at ? "border-brand-100 bg-white" : "border-brand-400 bg-brand-50"}`;
          return (
            <li key={n.id}>
              {n.link ? <Link href={n.link} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}