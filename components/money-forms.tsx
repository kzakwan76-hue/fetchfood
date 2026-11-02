"use client";

import { useActionState } from "react";
import { recordDeposit, recordPayout, setCommission, updateSettings } from "../app/admin/money-actions";

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const button = "rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50";

function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>;
  return null;
}

export function SettingsForm({ commissionPct, limit }: { commissionPct: number; limit: number }) {
  const [state, action, pending] = useActionState(updateSettings, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block font-medium">
        Default commission on food (%)
        <input name="commission" type="number" step="0.01" min={0} max={50} required defaultValue={commissionPct} className={input} />
      </label>
      <p className="text-neutral-600">Riders keep 100% of the delivery fee.</p>
      <label className="block font-medium">
        Default rider cash limit (Rs.). New orders are blocked at this amount.
        <input name="limit" type="number" min={0} max={1000000} required defaultValue={limit} className={input} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save rates"}</button>
    </form>
  );
}

export function CommissionForm({ restaurantId, customPct, currentPct }: { restaurantId: string; customPct: number | null; currentPct: number }) {
  const [state, action, pending] = useActionState(setCommission, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <label className="block font-medium">
        Custom commission (%). Leave empty to use the default (now {currentPct}%).
        <input name="rate" type="number" step="0.01" min={0} max={50} defaultValue={customPct ?? ""} className={input} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PayoutForm({ restaurantId, max }: { restaurantId: string; max: number }) {
  const [state, action, pending] = useActionState(recordPayout, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min={1} max={max} required defaultValue={max} aria-label="Amount paid (Rs.)" className={input} />
        <input name="note" maxLength={200} placeholder="Note, e.g. bank ref" aria-label="Note" className={input} />
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Recording…" : "Record payout"}</button>
    </form>
  );
}

export function DepositForm({ riderId, max }: { riderId: string; max: number }) {
  const [state, action, pending] = useActionState(recordDeposit, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="riderId" value={riderId} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min={1} max={max} required defaultValue={max} aria-label="Amount handed in (Rs.)" className={input} />
        <input name="note" maxLength={200} placeholder="Note" aria-label="Note" className={input} />
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Recording…" : "Record deposit"}</button>
    </form>
  );
}