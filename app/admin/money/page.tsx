import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, Stat, card } from "../../../components/admin-ui";
import { DepositForm, PayoutForm, SettingsForm } from "../../../components/money-forms";
import { requireAdmin } from "../../../lib/admin";
import { formatOrderTime } from "../../../lib/order-status";
import { formatPKR } from "../../../lib/pk";
import type { RestRow } from "../restaurants/page";
import type { RiderRow } from "../riders/page";

export const metadata = { title: "Money" };

type Settings = { c_commission_bps: number; c_rider_bps: number; c_limit: number };
type Log = { g_kind: string; g_who: string; g_amount: number; g_note: string | null; g_created: string };

export default function AdminMoneyPage() {
  return (
    <AdminPage title="Money and settlements">
      <Money />
    </AdminPage>
  );
}

async function Money() {
  await connection();
  const supabase = await requireAdmin();
  const [{ data: s }, { data: rs }, { data: ri }, { data: lg }] = await Promise.all([
    supabase.rpc("admin_get_settings"),
    supabase.rpc("admin_restaurants"),
    supabase.rpc("admin_riders"),
    supabase.rpc("admin_recent_settlements"),
  ]);
  const settings = ((s ?? []) as Settings[])[0];
  const restaurants = (rs ?? []) as RestRow[];
  const riders = (ri ?? []) as RiderRow[];
  const log = (lg ?? []) as Log[];
  const owed = restaurants.reduce((sum, r) => sum + r.s_owed, 0);
  const held = riders.reduce((sum, r) => sum + r.r_held, 0);

  return (
    <div className="mt-4 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="We owe restaurants" value={formatPKR(owed)} warn={owed > 0} />
        <Stat label="Riders hold" value={formatPKR(held)} warn={held > 0} />
      </div>

      {settings && (
        <section className={card}>
          <h2 className="font-bold text-charcoal-900">Rates</h2>
          <p className="mb-2 text-neutral-600">Changes apply only to orders delivered from now on.</p>
          <SettingsForm
            commissionPct={settings.c_commission_bps / 100}
            riderPct={settings.c_rider_bps / 100}
            limit={settings.c_limit}
          />
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Pay restaurants</h2>
        <p className="text-sm text-neutral-600">Send the money first (bank, JazzCash, Easypaisa), then record it here.</p>
        <ul className="mt-2 space-y-3">
          {restaurants.filter((r) => r.s_owed > 0).map((r) => (
            <li key={r.s_id} className={card}>
              <p className="font-semibold text-charcoal-900">
                <Link href={`/admin/restaurants/${r.s_id}`} className="underline">{r.s_name}</Link> · owed {formatPKR(r.s_owed)}
              </p>
              <PayoutForm restaurantId={r.s_id} max={r.s_owed} />
            </li>
          ))}
          {restaurants.every((r) => r.s_owed <= 0) && <li className="text-sm text-neutral-600">Nobody is owed anything.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Collect rider cash</h2>
        <p className="text-sm text-neutral-600">Record a deposit when a rider hands cash in.</p>
        <ul className="mt-2 space-y-3">
          {riders.filter((r) => r.r_held > 0).map((r) => (
            <li key={r.r_id} className={card}>
              <p className="font-semibold text-charcoal-900">
                <Link href={`/admin/riders/${r.r_id}`} className="underline">{r.r_name ?? r.r_email}</Link> · holds {formatPKR(r.r_held)}
              </p>
              <DepositForm riderId={r.r_id} max={r.r_held} />
            </li>
          ))}
          {riders.every((r) => r.r_held <= 0) && <li className="text-sm text-neutral-600">No rider holds cash.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Recent records</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white text-sm">
          {log.map((g, i) => (
            <li key={i} className="flex justify-between gap-3 p-3">
              <span>
                {g.g_kind === "payout" ? "Paid to" : "Deposit from"} <strong>{g.g_who}</strong>
                {g.g_note ? ` · ${g.g_note}` : ""}
              </span>
              <span className="shrink-0 text-right">{formatPKR(g.g_amount)}<br /><span className="text-xs text-neutral-600">{formatOrderTime(g.g_created)}</span></span>
            </li>
          ))}
          {log.length === 0 && <li className="p-3 text-neutral-600">Nothing recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}