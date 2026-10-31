export function RatingBadge({ avg, count }: { avg: number | null; count: number }) {
  if (!count || avg === null) {
    return <span className="rounded-full bg-brand-100 px-2.5 py-1">New</span>;
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
      <span aria-hidden="true">★</span> {avg.toFixed(1)} <span className="font-normal">({count})</span>
      <span className="sr-only"> out of 5 stars from {count} reviews</span>
    </span>
  );
}