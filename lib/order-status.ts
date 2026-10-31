export const STATUS_LABEL: Record<string, string> = {
  placed: "New order",
  accepted: "Accepted",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "out_for_delivery"];

// The steps a customer sees on the progress timeline, in order.
export const TIMELINE = ["placed", "accepted", "preparing", "out_for_delivery", "delivered"] as const;

// Pill colours per status (UI only).
export const STATUS_TONE: Record<string, string> = {
  placed: "bg-amber-100 text-amber-900",
  accepted: "bg-sky-100 text-sky-900",
  preparing: "bg-orange-100 text-orange-900",
  out_for_delivery: "bg-violet-100 text-violet-900",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-neutral-200 text-neutral-700",
};

// Shown in Pakistan time whatever timezone the server is in.
export function formatOrderTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}