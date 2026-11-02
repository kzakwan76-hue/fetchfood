"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { unreadCount } from "../app/notifications/actions";

// Browsers may block sound until the person has tapped the page once; that is fine.
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // no sound available: the badge still updates
  }
}

export function NotificationBell({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const previous = useRef(initial);

  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const n = await unreadCount();
      if (n > previous.current) beep();
      previous.current = n;
      setCount(n);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications, ${count} unread`}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand-200 bg-white text-lg shadow-sm hover:bg-brand-100"
    >
      <span aria-hidden="true">🔔</span>
      {count > 0 && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}