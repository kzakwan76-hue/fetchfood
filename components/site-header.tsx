"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { itemCount } from "../lib/cart";
import { useCart } from "../lib/cart-store";
import { useHydrated, useZone } from "../lib/zone-store";

// The chat, login and signup screens have their own full-screen layout.
const HIDDEN = ["/assistant", "/login", "/signup"];

function Logo() {
  return (
    <Link href="/" className="text-xl font-extrabold tracking-tight text-brand-600">
      Fetch<span className="text-charcoal-900">Food</span>
    </Link>
  );
}

// Shown while the header is loading: just the logo, same height, so nothing jumps.
export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-brand-50/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Logo />
      </div>
    </header>
  );
}

export function SiteHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cart = useCart();
  const zone = useZone();
  const hydrated = useHydrated();
  if (HIDDEN.includes(pathname) || pathname.startsWith("/admin")) return null;

  const count = itemCount(cart);

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-brand-50/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        <Logo />
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/restaurants"
            className="flex min-w-0 items-center gap-1 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal-900 shadow-sm hover:bg-brand-100"
          >
            <span aria-hidden="true">📍</span>
            <span className="max-w-24 truncate">{hydrated ? (zone ? zone.name : "Choose area") : "\u00a0"}</span>
          </Link>
          <Link
            href="/cart"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand-200 bg-white text-lg shadow-sm hover:bg-brand-100"
          >
            <span aria-hidden="true">🛒</span>
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white"
              >
                {count}
              </span>
            )}
          </Link>
          {children}
        </div>
      </div>
    </header>
  );
}