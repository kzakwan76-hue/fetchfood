import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, OrderRows, Stat, card, type OrderRow } from "../../../components/admin-ui";
import { DiscountForm, OwnToggleForm, RemitForm } from "../../../components/own-rider-forms";
import { requireAdmin } from "../../../lib/admin";
import { formatOrderTime } from "../../../lib/order-status";
import { formatPKR } from "../../../lib/pk";
import type { RestRow } from "../restaurants/page";

export const metadata = { title: "Own riders" };

type Remit = { g_who: string; g_amount: number; g_note: string | null; g_created: string };

export default function OwnRidersPage() {
  return (
    <AdminPage title="Restaurants with their own riders">
      <OwnRiders />
    </AdminPage>
  );
}

async function OwnRiders() {
  await connection();
  const supabase = await requireAdmin();
  const [{ data: rs }, { data: disc }, { data: ord }, { data: rem }] = await Promise.all([
    supabase.rpc("admin_restaurants"),
    supabase.rpc("admin_get_own_discount"),
    supabase.rpc("admin_own_orders", { p_limit: 100 }),
    supabase.rpc("admin_recent_remittances"),
  ]);
  const all = (rs ?? []) as RestRow[];
  const own = all.filter((r) => r.s_own);
  const others = all.filter((r) => !r.s_own);
  const discountPct = typeof disc === "number" ? disc / 100 : 4;
  const sum = (f: (r: RestRow) => number) => own.reduce((total, r) => total + f(r), 0);

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-neutral-700">
        These restaurants deliver with their own riders. Their rider collects the cash and the restaurant keeps it, so
        they owe FetchFood our (lower) commission on the food. That is netted against what we owe them for orders our
        riders delivered. The restaurant keeps the whole delivery fee on its own deliveries.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Restaurants with own riders" value={String(own.length)} />
        <Stat label="They owe us" value={formatPKR(sum((r) => r.s_owes_us))} warn={sum((r) => r.s_owes_us) > 0} />
        <Stat label="We owe them" value={formatPKR(sum((r) => r.s_owed))} warn={sum((r) => r.s_owed) > 0} />
        <Stat label="Delivered by their own riders" value={String(sum((r) => r.s_own_orders))} />
        <Stat label="Delivered by our riders" value={String(sum((r) => r.s_platform_orders))} />
        <Stat label="We made from them" value={formatPKR(sum((r) => r.s_made))} />
      </div>

      <section className={card}>
        <h2 className="font-bold text-charcoal-900">Commission discount</h2>
        <p className="mb-2 text-neutral-600">
          Own-rider commission = the restaurant&apos;s normal commission minus this discount (for example 10% becomes 6%
          with a 4-point discount).
        </p>
        <DiscountForm discountPct={discountPct} />
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Own-rider restaurants</h2>
        {own.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">None yet. Switch one on below.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {own.map((r) => (
              <li key={r.s_id} className={card}>
                <Link href={`/admin/restaurants/${r.s_id}`} className="font-bold text-charcoal-900 underline">{r.s_name}</Link>
                <p className="text-neutral-700">
                  Commission {(r.s_bps / 100).toString()}% normally, <strong>{(r.s_eff_bps / 100).toString()}%</strong> with own riders
                </p>
                <ul className="mt-2 space-y-0.5">
                  <li>They owe us: <strong>{formatPKR(r.s_owes_us)}</strong></li>
                  <li>We owe them: <strong>{formatPKR(r.s_owed)}</strong></li>
                  <li>Delivered by their own riders: {r.s_own_orders}</li>
                  <li>Delivered by our riders: {r.s_platform_orders}</li>
                  <li>Orders delivered from the app (all): {r.s_orders}</li>
                  <li>We made from them: {formatPKR(r.s_made)}</li>
                  <li>They have paid us so far: {formatPKR(r.s_remitted)}</li>
                </ul>
                {r.s_owes_us > 0 && <RemitForm restaurantId={r.s_id} max={r.s_owes_us} />}
                <OwnToggleForm restaurantId={r.s_id} on />
              </li>
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-charcoal-900">Switch on for a restaurant</h2>
          <ul className="mt-2 space-y-2">
            {others.map((r) => (
              <li key={r.s_id} className={card}>
                <p className="font-semibold text-charcoal-900">{r.s_name}</p>
                <OwnToggleForm restaurantId={r.s_id} on={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Own-rider orders</h2>
        <OrderRows rows={(ord ?? []) as OrderRow[]} />
      </section>

      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Payments received from restaurants</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white text-sm">
          {((rem ?? []) as Remit[]).map((g, i) => (
            <li key={i} className="flex justify-between gap-3 p-3">
              <span>{g.g_who}{g.g_note ? ` · ${g.g_note}` : ""}</span>
              <span className="shrink-0 text-right">{formatPKR(g.g_amount)}<br /><span className="text-xs text-neutral-600">{formatOrderTime(g.g_created)}</span></span>
            </li>
          ))}
          {((rem ?? []) as Remit[]).length === 0 && <li className="p-3 text-neutral-600">Nothing recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}