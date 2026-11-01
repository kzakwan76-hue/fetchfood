"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "../app/auth/actions";

type Entry = { href: string; label: string; emoji: string };

const BROWSE: Entry[] = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/restaurants", label: "Restaurants", emoji: "🍽️" },
  { href: "/assistant", label: "Ask Moka", emoji: "🐥" },
  { href: "/cart", label: "Cart", emoji: "🛒" },
];
const ACCOUNT: Entry[] = [
  { href: "/orders", label: "My orders", emoji: "📦" },
  { href: "/favourites", label: "Favourites", emoji: "❤️" },
  { href: "/addresses", label: "Saved addresses", emoji: "🏡" },
  { href: "/feedback", label: "Send feedback", emoji: "💬" },
  { href: "/account", label: "Account", emoji: "👤" },
];

// Links are UI hints only. Every page and every database function checks the role again.
function workLinks(role: string | null): Entry[] {
  const out: Entry[] = [];
  if (role === "restaurant_owner" || role === "admin") {
    out.push({ href: "/dashboard", label: "Restaurant dashboard", emoji: "🧑‍🍳" });
    out.push({ href: "/dashboard/menu", label: "Menu and photos", emoji: "📸" });
  }
  if (role === "rider") out.push({ href: "/rider", label: "Rider deliveries", emoji: "🛵" });
  if (role === "admin") {
    out.push({ href: "/admin/overview", label: "Admin console", emoji: "🛠️" });
    out.push({ href: "/admin/feedback", label: "Feedback inbox", emoji: "📥" });
  }
  return out;
}

function Section({
  title,
  entries,
  onNavigate,
}: {
  title?: string;
  entries: Entry[];
  onNavigate: () => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-5">
      {title && <p className="px-3 text-xs font-bold uppercase tracking-wide text-charcoal-700">{title}</p>}
      <ul className="mt-1">
        {entries.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-charcoal-900 hover:bg-brand-100"
            >
              <span aria-hidden="true" className="w-6 text-center text-lg">
                {e.emoji}
              </span>
              {e.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SideMenu({
  signedIn,
  name,
  role,
}: {
  signedIn: boolean;
  name: string | null;
  role: string | null;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const work = workLinks(role);

  // The header has a backdrop blur, which turns it into the reference frame for "fixed" children.
  // Rendering the menu straight into <body> (a portal) makes it cover the real screen.
  const panel = (
    <>
      <div aria-hidden="true" onClick={close} className="fade-in fixed inset-0 z-40 bg-charcoal-900/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="slide-in fixed right-0 top-0 z-50 flex h-dvh w-80 max-w-[85vw] flex-col overflow-y-auto bg-white p-4 shadow-lift"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-extrabold tracking-tight text-brand-600">
              Fetch<span className="text-charcoal-900">Food</span>
            </p>
            <p className="truncate text-sm text-charcoal-700">
              {signedIn ? `Hi, ${name ?? "there"}` : "Welcome! Log in to order."}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-200 text-lg hover:bg-brand-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <Section entries={BROWSE} onNavigate={close} />
        {signedIn ? (
          <>
            <Section title="Your account" entries={ACCOUNT} onNavigate={close} />
            <Section title="Work" entries={work} onNavigate={close} />
            <form action={signOut} className="mt-6 border-t border-brand-100 pt-4">
              <button
                type="submit"
                className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 font-semibold text-charcoal-900 hover:bg-brand-100"
              >
                Log out
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6 space-y-2 border-t border-brand-100 pt-4">
            <Link
              href="/login"
              onClick={close}
              className="block rounded-xl bg-brand-600 px-4 py-2.5 text-center font-bold text-white hover:bg-brand-700"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={close}
              className="block rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-center font-bold text-charcoal-900 hover:bg-brand-100"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-200 bg-white text-xl shadow-sm hover:bg-brand-100"
      >
        <span aria-hidden="true">☰</span>
      </button>
      {open && createPortal(panel, document.body)}
    </>
  );
}