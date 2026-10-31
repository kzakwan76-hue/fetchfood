const STEPS = ["Cart", "Checkout", "Track order"];

export function FlowSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Order steps" className="mt-3 flex items-center gap-2 text-xs font-semibold">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                done || active ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className={active ? "text-charcoal-900" : "text-charcoal-700"}>{label}</span>
            {n < STEPS.length && <span aria-hidden="true" className="h-px w-6 bg-neutral-300" />}
          </li>
        );
      })}
    </ol>
  );
}