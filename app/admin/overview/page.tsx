import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, Stat, card } from "../../../components/admin-ui";
import { AdminCancelForm } from "../../../components/money-forms";
import { requireAdmin } from "../../../lib/admin";
import { formatPKR } from "../../../lib/pk";

export const metadata = { title: "Overview" };

type Ov = {
  ov_orders_today: number; ov_delivered_today: number; ov_active: number; ov_sales_today: number;
  ov_revenue_app: number; ov_revenue_own: number; ov_owed_app: number; ov_owed_own: number; ov_owes_us: number;
  ov_cash: number; ov_rider_owed: number; ov_on_duty: number; ov_riders: number; ov_rest_app: number; ov_rest_own: number;
};
type Attention = { a_order: string; a_kind: string; a_restaurant: string; a_minutes: number };
type Stale = { s_rider: string; s_name: string; s_held: number; s_hours: number };

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
  await supabase.rpc("run_sweep"); // stuck-order check (does real work at most once every 30 seconds)
  const [{ data }, { data: att }, { data: stale }, { data: set }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_attention"),
    supabase.rpc("admin_stale_riders"),
    supabase.rpc("admin_get_settings"),
  ]);
  const o = ((data ?? []) as Ov[])[0];
  if (!o) return <p className="mt-4 text-sm text-neutral-600">No data.</p>;
  const attention = (att ?? []) as Attention[];
  const staleRiders = (stale ?? []) as Stale[];
  const dutyRuleOn = ((set ?? []) as { c_require_duty: boolean }[])[0]?.c_require_duty ?? false;

  return (
    <div className="mt-4 space-y-5">
      {!dutyRuleOn && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The on-duty rule is OFF: customers can order even when no rider is working. Turn it on at{" "}
          <Link href="/admin/money" className="font-bold underline">Money</Link> before launch.
        </p>
      )}

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Needs attention ({attention.length})</h2>
        {attention.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-600">Nothing is stuck.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {attention.map((a) => (
              <li key={a.a_order} className={`${card} border-amber-300 bg-amber-50`}>
                <p className="font-semibold text-charcoal-900">
                  {a.a_kind}: {a.a_restaurant} · {a.a_minutes} min
                </p>
                <Link href={`/admin/orders/${a.a_order}`} className="font-semibold text-brand-700 underline">
                  Open order #{a.a_order.slice(0, 8)}
                </Link>
                <AdminCancelForm orderId={a.a_order} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {staleRiders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-charcoal-900">Riders holding cash for over 24 hours</h2>
          <ul className="mt-2 space-y-2">
            {staleRiders.map((r) => (
              <li key={r.s_rider} className={`${card} border-red-300 bg-red-50`}>
                <Link href={`/admin/riders/${r.s_rider}`} className="font-semibold text-red-800 underline">{r.s_name}</Link>{" "}
                holds {formatPKR(r.s_held)} · for about {r.s_hours} hours. Call them and collect it.
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-neutral-600">&ldquo;Today&rdquo; is Pakistan time. Money figures count orders delivered after the ledger was added.</p>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Today</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Orders today" value={String(o.ov_orders_today)} />
          <Stat label="Delivered today" value={String(o.ov_delivered_today)} />
          <Stat label="Active right now" value={String(o.ov_active)} />
          <Stat label="Sales delivered today" value={formatPKR(o.ov_sales_today)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Restaurants using FetchFood riders</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Restaurants" value={String(o.ov_rest_app)} />
          <Stat label="FetchFood net revenue (all time)" value={formatPKR(o.ov_revenue_app)} />
          <Stat label="We owe these restaurants" value={formatPKR(o.ov_owed_app)} warn={o.ov_owed_app > 0} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">
          Restaurants with their own riders{" "}
          <Link href="/admin/own-riders" className="text-sm font-semibold text-brand-700 underline">details →</Link>
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Restaurants" value={String(o.ov_rest_own)} />
          <Stat label="FetchFood net revenue (all time)" value={formatPKR(o.ov_revenue_own)} />
          <Stat label="We owe these restaurants" value={formatPKR(o.ov_owed_own)} warn={o.ov_owed_own > 0} />
          <Stat label="Restaurants owe us" value={formatPKR(o.ov_owes_us)} warn={o.ov_owes_us > 0} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">FetchFood riders</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="We owe riders" value={formatPKR(o.ov_rider_owed)} warn={o.ov_rider_owed > 0} />
          <Stat label="Riders hold (cash)" value={formatPKR(o.ov_cash)} warn={o.ov_cash > 0} />
          <Stat label="Riders on duty" value={`${o.ov_on_duty} of ${o.ov_riders}`} />
        </div>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-semibold text-brand-700">
        <Link href="/admin/orders">All orders →</Link>
        <Link href="/admin/money">Settle up →</Link>
      </div>
    </div>
  );
}