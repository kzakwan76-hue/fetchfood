"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePeek } from "../lib/peek-store";
import { MokaPeek } from "./moka-peek";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Only on browsing pages, never on a menu (it would cover the Add buttons), the chat, checkout or staff pages.
export function AskMokaButton() {
  const pathname = usePathname();
  const focus = usePeek();
  const show = pathname === "/restaurants" || pathname === "/cart" || pathname === "/orders";
  if (!show) return null;

  const looking = pathname === "/restaurants" && focus !== null;
  const tilt = focus && looking ? clamp(-6 + focus.dy * 14, -20, -3) : 0;

  return (
    <Link
      href="/assistant"
      aria-label="Ask Moka what to eat"
      className="fixed bottom-20 right-4 z-20 flex items-center gap-2 motion-safe:transition motion-safe:hover:-translate-y-0.5"
    >
      {looking && focus && (
        <span className="rise max-w-40 truncate rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-bold text-charcoal-900 shadow-lift">
          👀 {focus.name}?
        </span>
      )}
      <MokaPeek tilt={tilt} looking={looking} size={76} />
    </Link>
  );
}