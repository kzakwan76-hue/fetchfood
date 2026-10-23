"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// No realtime yet: the dashboard re-checks for new orders every 30 seconds.
export function RefreshButton() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800"
    >
      Refresh
    </button>
  );
}