"use client";

import { useActionState } from "react";
import {
  setRestaurantActive,
  setRestaurantOwner,
  updateRestaurantDetails,
  updateZone,
} from "../app/admin/manage-actions";

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const button = "rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50";

function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>;
  return null;
}

export function RestaurantDetailsForm(p: { id: string; name: string; cuisine: string; area: string; eta: number; fee: number }) {
  const [state, action, pending] = useActionState(updateRestaurantDetails, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={p.id} />
      <label className="block font-medium">Name<input name="name" required maxLength={80} defaultValue={p.name} className={input} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block font-medium">Cuisine<input name="cuisine" required maxLength={40} defaultValue={p.cuisine} className={input} /></label>
        <label className="block font-medium">Area<input name="area" required maxLength={60} defaultValue={p.area} className={input} /></label>
        <label className="block font-medium">Delivery time (min)<input name="eta" type="number" min={5} max={180} required defaultValue={p.eta} className={input} /></label>
        <label className="block font-medium">Flat delivery fee (Rs.)<input name="fee" type="number" min={0} max={2000} required defaultValue={p.fee} className={input} /></label>
      </div>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save details"}</button>
    </form>
  );
}

export function OwnerForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(setRestaurantOwner, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block font-medium">New owner&apos;s email (must already have an account)
        <input name="email" type="email" required className={input} />
      </label>
      <Msg {...state} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => { if (!window.confirm("Change the owner of this restaurant?")) e.preventDefault(); }}
        className={button}
      >
        {pending ? "Saving…" : "Change owner"}
      </button>
    </form>
  );
}

export function ActiveForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(setRestaurantActive, {});
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Msg {...state} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (active && !window.confirm("Hide this restaurant from customers? It will also be closed.")) e.preventDefault();
        }}
        className={active ? "rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" : button}
      >
        {pending ? "Saving…" : active ? "Hide restaurant" : "Make visible again"}
      </button>
    </form>
  );
}

export function ZoneEditForm({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [state, action, pending] = useActionState(updateZone, {});
  return (
    <form action={action} className="space-y-2 py-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <input name="name" required maxLength={60} defaultValue={name} aria-label="Zone name" className={input} />
        <button type="submit" disabled={pending} className={button}>{pending ? "…" : "Save"}</button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={active} /> Active (customers can pick it)
      </label>
      <Msg {...state} />
    </form>
  );
}