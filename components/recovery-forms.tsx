"use client";

import { useActionState } from "react";
import { requestReset, setNewPassword } from "../app/auth/recovery-actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";
const buttonClass =
  "w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-60";

function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>;
  return null;
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-neutral-800">
        Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(setNewPassword, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-neutral-800">
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Repeat the new password
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </label>
      <Msg {...state} />
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}