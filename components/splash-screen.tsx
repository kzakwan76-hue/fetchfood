"use client";

import { useEffect, useState, type ReactNode } from "react";

const SEEN_KEY = "fetchfood-splash-seen";
const DURATION_MS = 1800;

// Splash pose: sunglasses always on, burger held and bitten in a loop.
// Scoped to .moka-splash so the rest of the app's Moka is untouched.
const CSS = `
.moka-splash .moka-glasses { opacity: 1; }
.moka-splash .moka-body { animation: splash-bob 0.72s ease-in-out infinite; }
.moka-splash .moka-bill-low { animation: splash-chew 6s ease-in-out infinite; }
.moka-splash .moka-food { animation: splash-meal 6s ease-in-out infinite; }

@keyframes splash-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}

@keyframes splash-chew {
  0%, 8% { transform: translateY(0); }
  10% { transform: translateY(6px); }
  12% { transform: translateY(0); }
  14% { transform: translateY(5px); }
  16% { transform: translateY(0); }
  18% { transform: translateY(5px); }
  20%, 30% { transform: translateY(0); }
  32% { transform: translateY(6px); }
  34% { transform: translateY(0); }
  36% { transform: translateY(5px); }
  38% { transform: translateY(0); }
  40% { transform: translateY(5px); }
  42%, 52% { transform: translateY(0); }
  54% { transform: translateY(6px); }
  56% { transform: translateY(0); }
  58% { transform: translateY(5px); }
  60% { transform: translateY(0); }
  62% { transform: translateY(5px); }
  64% { transform: translateY(0); }
  66% { transform: translateY(4px); }
  68%, 100% { transform: translateY(0); }
}

@keyframes splash-meal {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  8% { transform: translate(0, -26px) scale(1); opacity: 1; }
  14% { transform: translate(0, -26px) scale(0.8); opacity: 1; }
  22% { transform: translate(0, 0) scale(0.8); opacity: 1; }
  30% { transform: translate(0, -26px) scale(0.8); opacity: 1; }
  36% { transform: translate(0, -26px) scale(0.55); opacity: 1; }
  44% { transform: translate(0, 0) scale(0.55); opacity: 1; }
  52% { transform: translate(0, -26px) scale(0.55); opacity: 1; }
  58% { transform: translate(0, -26px) scale(0.25); opacity: 1; }
  64%, 80% { transform: translate(0, -12px) scale(0); opacity: 0; }
  88%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .moka-splash .moka-body,
  .moka-splash .moka-bill-low,
  .moka-splash .moka-food { animation: none; }
}
`;

export function SplashScreen({ mascot }: { mascot: ReactNode }) {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) {
        start = now;
        let seen = false;
        try {
          seen = sessionStorage.getItem(SEEN_KEY) === "1";
        } catch {}
        if (seen) {
          setPhase("gone");
          return;
        }
      }

      const p = Math.min(1, (now - start) / DURATION_MS);
      setProgress(p);

      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {}
        setPhase("fade");
        timer = setTimeout(() => setPhase("gone"), 400);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-label="Loading FetchFood"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#ea580c] px-8 transition-opacity duration-300 ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{CSS}</style>
      {mascot}
      <p className="text-4xl font-extrabold tracking-tight text-white">FetchFood</p>
      <div className="h-2.5 w-56 overflow-hidden rounded-full bg-white/30">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}