"use client";

import { useActionState } from "react";
import { createRestaurant, setRole } from "../app/admin/actions";

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const button =
  "rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50";

function Message({ error, ok }: { error?: string; ok?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        {ok}
      </p>
    );
  }
  return null;
}

export function RoleForm() {
  const [state, action, pending] = useActionState(setRole, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">
        Account email
        <input name="email" type="email" required className={input} />
      </label>
      <label className="block text-sm font-medium">
        Role
        <select name="role" className={input} defaultValue="restaurant_owner">
          <option value="customer">customer</option>
          <option value="restaurant_owner">restaurant_owner</option>
          <option value="rider">rider</option>
        </select>
      </label>
      <Message {...state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : "Set role"}
      </button>
    </form>
  );
}

export function RestaurantForm() {
  const [state, action, pending] = useActionState(createRestaurant, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">
        Name
        <input name="name" required maxLength={80} className={input} />
      </label>
      <label className="block text-sm font-medium">
        Slug (web address, e.g. pizza-point)
        <input name="slug" required maxLength={40} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Cuisine
          <input name="cuisine" required maxLength={40} className={input} />
        </label>
        <label className="block text-sm font-medium">
          Area
          <input name="area" required maxLength={60} className={input} />
        </label>
        <label className="block text-sm font-medium">
          Delivery time (minutes)
          <input name="eta" type="number" required min={5} max={180} defaultValue={40} className={input} />
        </label>
        <label className="block text-sm font-medium">
          Delivery fee (Rs.)
          <input name="fee" type="number" required min={0} max={2000} defaultValue={150} className={input} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Owner email (must already have an account)
        <input name="ownerEmail" type="email" required className={input} />
      </label>
      <Message {...state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Creating…" : "Create restaurant"}
      </button>
    </form>
  );
}