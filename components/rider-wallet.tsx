import Link from "next/link";
import { formatPKR } from "../lib/pk";
import { createClient } from "../lib/supabase/server";

type Wallet = { w_delivered: number; w_earned: number; w_held: number; w_limit: number };
type Application = { m_status: string };

// Rendered inside the rider page, which has already awaited connection().
export async function RiderWallet() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("rider_wallet");
  const w = ((data ?? []) as Wallet[])[0];
  const { data: appData } = await supabase.rpc("rider_my_application");
  const status = ((appData ?? []) as Application[])[0]?.m_status ?? null;
  if (!w) return null;
  const blocked = w.w_held >= w.w_limit;

  return (
    <>
      {status !== "approved" && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {status === null
            ? "You have no rider profile on file, so you can't take orders yet."
            : `Your rider profile is ${status}, so you can't take orders.`}{" "}
          <Link href="/rider/apply" className="font-bold underline">Open your rider profile</Link>
        </p>
      )}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-xs text-neutral-600">Delivered</p><p className="text-lg font-bold">{w.w_delivered}</p></div>
          <div><p className="text-xs text-neutral-600">You earned</p><p className="text-lg font-bold">{formatPKR(w.w_earned)}</p></div>
          <div><p className="text-xs text-neutral-600">Cash to hand in</p><p className="text-lg font-bold">{formatPKR(w.w_held)}</p></div>
        </div>
        <p className={`mt-2 ${blocked ? "font-semibold text-red-700" : "text-neutral-600"}`}>
          {blocked
            ? "You have reached the cash limit. Hand the cash to FetchFood to take new orders."
            : `New orders pause when your cash reaches ${formatPKR(w.w_limit)}. You keep the whole delivery fee.`}
        </p>
      </section>
    </>
  );
}