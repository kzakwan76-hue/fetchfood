"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useHydrated, useZone } from "../lib/zone-store";
import { AskMokaPill } from "./ask-moka-pill";

// The chat, login and signup screens have their own full-screen layout; the admin console has its own header.
const HIDDEN = ["/assistant", "/login", "/signup"];

const shell = "sticky top-0 z-30 bg-brand-600 px-3 py-2 shadow-card";
const bar = "mx-auto flex h-11 max-w-3xl items-center justify-between gap-2";

function Logo() {
  return (
    <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
      Fetch<span className="text-charcoal-900">Food</span>
    </Link>
  );
}

// Shown while the header is loading: just the logo, same height, so nothing jumps.
export function HeaderFallback() {
  return (
    <header className={shell}>
      <div className={bar}>
        <Logo />
      </div>
    </header>
  );
}

function HomeHeader({ areaName, children }: { areaName: string; children: ReactNode }) {
  return (
    <header>
      <div className="bg-brand-600 px-4 pt-3 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/restaurants" className="min-w-0">
              <span className="block text-sm font-semibold text-white">Deliver to</span>
              <span className="flex items-center gap-1 text-base font-bold">
                <span aria-hidden="true">📍</span>
                <span className="truncate">{areaName}</span>
                <span aria-hidden="true">▾</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">{children}</div>
          </div>
          <form
            action="/restaurants"
            method="get"
            role="search"
            className="mt-3 flex items-center rounded-full bg-white p-1.5 pl-4 shadow-card focus-within:ring-4 focus-within:ring-brand-300"
          >
            <span aria-hidden="true" className="text-charcoal-700">🔍</span>
            <input
              name="q"
              type="search"
              aria-label="Search restaurants"
              placeholder="Search restaurants, cuisines…"
              className="pill-input min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-700"
            />
            <AskMokaPill />
          </form>
        </div>
      </div>
      <svg aria-hidden="true" viewBox="0 0 360 28" preserveAspectRatio="none" className="block h-6 w-full fill-brand-600">
        <path d="M0 0H360V10C300 28 240 4 180 14C120 24 60 24 0 8Z" />
      </svg>
    </header>
  );
}

export function SiteHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const zone = useZone();
  const hydrated = useHydrated();
  if (HIDDEN.includes(pathname) || pathname.startsWith("/admin")) return null;

  const areaName = hydrated ? (zone ? zone.name : "Choose your area") : "\u00a0";

  if (pathname === "/") return <HomeHeader areaName={areaName}>{children}</HomeHeader>;

  return (
    <header className={shell}>
      <div className={bar}>
        <Logo />
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/restaurants"
            className="flex min-w-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-charcoal-900 shadow-sm hover:bg-brand-100"
          >
            <span aria-hidden="true">📍</span>
            <span className="max-w-24 truncate">{areaName}</span>
          </Link>
          {children}
        </div>
      </div>
    </header>
  );
}