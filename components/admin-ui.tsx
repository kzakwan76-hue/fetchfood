import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { STATUS_LABEL, STATUS_TONE, formatOrderTime } from "../lib/order-status";
import { formatPKR } from "../lib/pk";
import { ListSkeleton } from "./skeleton";

export const card = "rounded-2xl border border-neutral-200 bg-white p-4 text-sm";

export function AdminPage({
  title,
  back,
  children,
}: {
  title: string;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      {back && (
        <Link href={back.href} className="text-sm font-semibold text-brand-700">
          ← {back.label}
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900">{title}</h1>
      <Suspense fallback={<ListSkeleton rows={3} height="h-24" />}>{children}</Suspense>
    </main>
  );
}

export function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`${card} ${warn ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-charcoal-900">{value}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[status] ?? "bg-neutral-200 text-neutral-700"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Line({ label, value, bold }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1 ${bold ? "font-bold text-charcoal-900" : ""}`}>
      <dt className="text-neutral-600">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

export type OrderRow = {
  o_id: string;
  o_created: string;
  o_status: string;
  o_restaurant: string;
  o_customer: string;
  o_total: number;
  o_rider: string | null;
};

export function OrderRows({ rows }: { rows: OrderRow[] }) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-neutral-600">No orders.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((o) => (
        <li key={o.o_id}>
          <Link href={`/admin/orders/${o.o_id}`} className={`${card} block hover:border-brand-500`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-charcoal-900">
                #{o.o_id.slice(0, 8)} · {o.o_restaurant}
              </p>
              <StatusPill status={o.o_status} />
            </div>
            <p className="mt-1 text-neutral-700">
              {o.o_customer} · {formatPKR(o.o_total)} · {formatOrderTime(o.o_created)}
            </p>
            <p className="text-neutral-600">Rider: {o.o_rider ?? "none yet"}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}