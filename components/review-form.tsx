"use client";

import { useActionState, useState } from "react";
import { submitReview } from "../app/orders/review-actions";

export function ReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(submitReview, {});
  const [rating, setRating] = useState(0);

  return (
    <form action={action} className="space-y-3 rounded-3xl border border-brand-200 bg-white p-4 shadow-card">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="font-bold text-charcoal-900">How was your order?</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={`text-4xl leading-none ${n <= rating ? "text-amber-500" : "text-neutral-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="block text-sm font-medium text-charcoal-800">
        Comment (optional)
        <textarea
          name="comment"
          rows={3}
          maxLength={500}
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
        disabled={pending || rating === 0}
        className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}