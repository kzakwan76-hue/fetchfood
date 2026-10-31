"use client";

import { useActionState } from "react";
import { sendFeedback } from "../app/feedback/actions";

export function FeedbackForm() {
  const [state, action, pending] = useActionState(sendFeedback, {});

  if (state.ok) {
    return (
      <p role="status" className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
        Thank you! We read every message.
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <label className="block text-sm font-medium text-charcoal-800">
        What kind of feedback?
        <select
          name="kind"
          defaultValue="suggestion"
          className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2"
        >
          <option value="suggestion">An idea or suggestion</option>
          <option value="problem">Something went wrong</option>
          <option value="praise">Something I liked</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-charcoal-800">
        Your message
        <textarea
          name="message"
          rows={5}
          required
          minLength={5}
          maxLength={1000}
          className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}