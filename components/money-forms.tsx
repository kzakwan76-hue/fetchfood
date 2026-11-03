"use client";

import { useActionState } from "react";
import {
  addCredit,
  cancelOrderAdmin,
  recordDeposit,
  recordPayout,
  recordRiderPayout,
  setCommission,
  updateRules,
  updateSettings,
} from "../app/admin/money-actions";

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


export function RulesForm({ requireDuty, bonus, cancel }: { requireDuty: boolean; bonus: number; cancel: number }) {
  const [state, action, pending] = useActionState(updateRules, {});
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-center gap-2 font-medium">
        <input type="checkbox" name="requireDuty" defaultChecked={requireDuty} />
        Only take orders in a zone while a rider is on duty there
      </label>
      <label className="block font-medium">
        Bonus for an order nobody took within 5 minutes (Rs.)
        <input name="bonus" type="number" min={0} max={5000} required defaultValue={bonus} className={input} />
      </label>
      <label className="block font-medium">
        Cancel an unclaimed order after (minutes, 15 to 120)
        <input name="cancel" type="number" min={15} max={120} required defaultValue={cancel} className={input} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save rules"}</button>
    </form>
  );
}

export function RiderPayoutForm({ riderId, max }: { riderId: string; max: number }) {
  const [state, action, pending] = useActionState(recordRiderPayout, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="riderId" value={riderId} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min={1} max={max} required defaultValue={max} aria-label="Amount paid (Rs.)" className={input} />
        <input name="note" maxLength={200} placeholder="Note, e.g. JazzCash ref" aria-label="Note" className={input} />
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Recording…" : "Record rider payout"}</button>
    </form>
  );
}

export function CreditForm({ riders }: { riders: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addCredit, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block font-medium">
        Rider
        <select name="riderId" required defaultValue="" className={input}>
          <option value="" disabled>Choose a rider</option>
          {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min={1} max={100000} required placeholder="Amount (Rs.)" aria-label="Amount (Rs.)" className={input} />
        <input name="note" maxLength={200} required placeholder="Why, e.g. referral bonus" aria-label="Reason" className={input} />
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Adding…" : "Add incentive"}</button>
    </form>
  );
}

export function AdminCancelForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(cancelOrderAdmin, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input name="reason" maxLength={100} placeholder="Reason (the customer sees it)" aria-label="Reason" className={input} />
      <Msg {...state} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm("Cancel this order? The customer and the restaurant will be told.")) e.preventDefault();
        }}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel this order"}
      </button>
    </form>
  );
}