"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "../app/auth/actions";

const LINKS = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/riders", label: "Riders" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/own-riders", label: "Own riders" },
  { href: "/admin", label: "Setup" },
  { href: "/admin/feedback", label: "Feedback" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-charcoal-900 text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm font-extrabold tracking-tight">
          FetchFood{" "}
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs text-charcoal-900">Admin</span>
        </p>
        <form action={signOut}>
          <button type="submit" className="rounded-lg border border-white/30 px-3 py-1 text-xs font-semibold hover:bg-white/10">
            Log out
          </button>
        </form>
      </div>
      <nav aria-label="Admin" className="no-scrollbar mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${
                active ? "bg-white text-charcoal-900" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}