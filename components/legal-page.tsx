import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "../lib/site";

export function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-base font-bold text-charcoal-900">{title}</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">{title}</h1>
      <p className="mt-1 text-xs text-charcoal-700">Last updated {SITE.updated}</p>
      <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This is our pilot version, written in plain language. We may update it, and we will tell you about important changes.
      </p>
      <div className="mt-4 space-y-5 text-sm leading-6 text-charcoal-800">{children}</div>
      <nav aria-label="Legal pages" className="mt-8 flex flex-wrap gap-4 border-t border-brand-200 pt-4 text-sm font-semibold text-brand-700">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/rider-agreement">Rider agreement</Link>
        <Link href="/restaurant-agreement">Restaurant agreement</Link>
        <Link href="/help">Help</Link>
      </nav>
    </main>
  );
}