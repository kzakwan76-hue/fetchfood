"use client";

import { useActionState } from "react";
import { deleteAccount, updateProfile } from "../app/account/actions";

const input = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";

function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>;
  return null;
}

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium text-neutral-800">
        Full name
        <input name="name" required defaultValue={name} autoComplete="name" className={input} />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Mobile number
        <input name="phone" type="tel" required defaultValue={phone} autoComplete="tel" className={input} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className="rounded-xl bg-brand-600 px-4 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function DeleteForm() {
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-neutral-800">
        This removes your login, profile, favourites and saved addresses for good. Your past orders stay in our records
        without your name, address, phone or pin.
      </p>
      <label className="block text-sm font-medium text-neutral-800">
        Type DELETE to confirm
        <input name="confirm" required autoComplete="off" className={input} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className="rounded-xl border border-red-300 bg-white px-4 py-2.5 font-bold text-red-700 disabled:opacity-60">
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}