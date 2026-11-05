"use client";

import { useActionState, useState } from "react";
import { setRestaurantLocation, updateFees } from "../app/admin/delivery-actions";
import { LocationPicker, type Pin } from "./location-picker";

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const button = "rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50";

function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>;
  return null;
}

export function FeesForm({
  nearKm, nearFee, midKm, midFee, farFee, maxKm,
}: {
  nearKm: number; nearFee: number; midKm: number; midFee: number; farFee: number; maxKm: number;
}) {
  const [state, action, pending] = useActionState(updateFees, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block font-medium">Near: up to (km)
          <input name="nearKm" type="number" step="0.1" min={0.5} max={10} required defaultValue={nearKm} className={input} />
        </label>
        <label className="block font-medium">Near fee (Rs.)
          <input name="nearFee" type="number" min={0} max={2000} required defaultValue={nearFee} className={input} />
        </label>
        <label className="block font-medium">Middle: up to (km)
          <input name="midKm" type="number" step="0.1" min={1} max={15} required defaultValue={midKm} className={input} />
        </label>
        <label className="block font-medium">Middle fee (Rs.)
          <input name="midFee" type="number" min={0} max={2000} required defaultValue={midFee} className={input} />
        </label>
        <label className="block font-medium">Farthest fee (Rs.)
          <input name="farFee" type="number" min={0} max={2000} required defaultValue={farFee} className={input} />
        </label>
        <label className="block font-medium">We deliver up to (km)
          <input name="maxKm" type="number" step="0.1" min={1} max={25} required defaultValue={maxKm} className={input} />
        </label>
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save fees"}</button>
    </form>
  );
}

export function RestaurantLocationForm({
  restaurantId, lat, lng,
}: {
  restaurantId: string; lat: number | null; lng: number | null;
}) {
  const [state, action, pending] = useActionState(setRestaurantLocation, {});
  const [pin, setPin] = useState<Pin | null>(lat !== null && lng !== null ? { lat, lng } : null);
  return (
    <form action={action} className="mt-2 space-y-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="lat" value={pin ? String(pin.lat) : ""} />
      <input type="hidden" name="lng" value={pin ? String(pin.lng) : ""} />
      <LocationPicker value={pin} onChange={setPin} />
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : pin ? "Save location" : "Remove location"}
      </button>
    </form>
  );
}