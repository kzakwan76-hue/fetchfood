"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { itemCount } from "../lib/cart";
import { useCart } from "../lib/cart-store";

// Pages that have their own full-screen layout or are staff-only get no tab bar.
const HIDDEN = [
  "/assistant", "/login", "/signup", "/forgot-password", "/reset-password", "/auth",
  "/admin", "/dashboard", "/rider", "/checkout",
];
const PROFILE = ["/account", "/orders", "/favourites", "/addresses", "/notifications", "/feedback"];

const startsWith = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

function Tab({ href, label, emoji, active, badge }: {
  href: string; label: string; emoji: string; active: boolean; badge?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${active ? "text-brand-700" : "text-charcoal-700"}`}
      >
        <span className="relative text-xl" aria-hidden="true">
          <span className={active ? "" : "opacity-60 grayscale"}>{emoji}</span>
          {badge ? (
            <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        {label}
      </Link>
    </li>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const cart = useCart();
  if (HIDDEN.some((p) => startsWith(pathname, p))) return null;

  const count = itemCount(cart);
  const searching = pathname === "/restaurants" && params.get("search") === "1";
  const browsing = startsWith(pathname, "/restaurants") && !searching;

  return (
    <>
      <div aria-hidden="true" className="h-24" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgba(194,65,12,0.35)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5 items-end px-2">
          <Tab href="/" label="Home" emoji="🏠" active={pathname === "/"} />
          <Tab href="/restaurants?search=1" label="Search" emoji="🔍" active={searching} />
          <li className="flex flex-col items-center pb-1.5">
            <Link
              href="/restaurants"
              aria-label="Restaurants"
              aria-current={browsing ? "page" : undefined}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl shadow-lift ring-4 ring-white hover:bg-brand-700"
            >
              <span aria-hidden="true">🍽️</span>
            </Link>
            <span className={`mt-0.5 text-xs font-semibold ${browsing ? "text-brand-700" : "text-charcoal-700"}`}>
              Restaurants
            </span>
          </li>
          <Tab href="/cart" label="Cart" emoji="🛒" active={pathname === "/cart"} badge={count} />
          <Tab href="/account" label="Profile" emoji="👤" active={PROFILE.some((p) => startsWith(pathname, p))} />
        </ul>
      </nav>
    </>
  );
}