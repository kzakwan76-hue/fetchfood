import { STATUS_LABEL, TIMELINE } from "../lib/order-status";

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <p className="rounded-2xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-800">
        This order was cancelled.
      </p>
    );
  }

  const current = TIMELINE.indexOf(status as (typeof TIMELINE)[number]);

  return (
    <ol aria-label="Order progress" className="rounded-3xl border border-brand-200 bg-white p-4 shadow-card">
      {TIMELINE.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex gap-3" aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done || active ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-600"
                } ${active ? "motion-safe:animate-pulse" : ""}`}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < TIMELINE.length - 1 && (
                <span className={`min-h-5 w-0.5 flex-1 ${i < current ? "bg-brand-500" : "bg-neutral-300"}`} />
              )}
            </div>
            <p className={`pb-4 pt-1 text-sm ${active ? "font-bold text-charcoal-900" : "text-charcoal-700"}`}>
              {STATUS_LABEL[step]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}