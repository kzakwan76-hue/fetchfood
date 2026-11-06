"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MokaMascot } from "./moka-mascot";

// Only on browsing pages, never on a menu (it would cover the Add buttons), the chat, checkout or staff pages.
export function AskMokaButton() {
  const pathname = usePathname();
  const show = pathname === "/restaurants" || pathname === "/cart" || pathname === "/orders";
  if (!show) return null;

  return (
    <Link
      href="/assistant"
      aria-label="Ask Moka what to eat"
      className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full border border-brand-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-bold text-charcoal-900 shadow-lift motion-safe:transition motion-safe:hover:-translate-y-0.5"
    >
      <MokaMascot variant="head" size={36} />
      Ask Moka
    </Link>
  );
}