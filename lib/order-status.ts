export const STATUS_LABEL: Record<string, string> = {
  placed: "New order",
  accepted: "Accepted",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "out_for_delivery"];

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