"use client";

import { useActionState } from "react";
import { reviewRider } from "../app/admin/rider-actions";

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const dark = "rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50";
const light = "rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50";

export function RiderReviewForm({
  riderId, status, zones, zoneId, deposit, limit,
}: {
  riderId: string;
  status: string;
  zones: { id: string; name: string }[];
  zoneId: string | null;
  deposit: number;
  limit: number | null;
}) {
  const [state, action, pending] = useActionState(reviewRider, {});
  return (
    <form action={action} className="mt-2 space-y-3">
      <input type="hidden" name="riderId" value={riderId} />
      {status === "pending" && (
        <>
          <label className="block font-medium">Zone
            <select name="zoneId" required defaultValue={zoneId ?? ""} className={input}>
              <option value="" disabled>Choose a zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </label>
          <label className="block font-medium">Security deposit received (Rs.)
            <input name="deposit" type="number" min={0} max={1000000} defaultValue={deposit} className={input} />
          </label>
          <label className="block font-medium">Personal cash limit (Rs.). Empty = the default limit.
            <input name="limit" type="number" min={0} max={1000000} defaultValue={limit ?? ""} className={input} />
          </label>
          <label className="block font-medium">Reason (required to reject)
            <textarea name="note" rows={2} maxLength={300} className={input} />
          </label>
        </>
      )}
      {status === "approved" && (
        <label className="block font-medium">Reason for suspending (optional)
          <input name="note" maxLength={300} className={input} />
        </label>
      )}
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <>
            <button type="submit" name="intent" value="approve" disabled={pending} className={dark}>Approve as rider</button>
            <button type="submit" name="intent" value="reject" formNoValidate disabled={pending} className={light}>Reject</button>
          </>
        )}
        {status === "approved" && (
          <button type="submit" name="intent" value="suspend" disabled={pending} className={light}
            onClick={(e) => { if (!window.confirm("Suspend this rider? They can't take new orders.")) e.preventDefault(); }}>
            Suspend rider
          </button>
        )}
        {status === "suspended" && (
          <button type="submit" name="intent" value="reinstate" disabled={pending} className={dark}>Reinstate rider</button>
        )}
      </div>
    </form>
  );
}