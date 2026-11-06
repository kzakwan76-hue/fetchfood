"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <p className="text-4xl" aria-hidden="true">🍳</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal-900">Something burned in the kitchen</h1>
      <p className="mt-2 text-charcoal-700">That wasn&apos;t supposed to happen. Please try again. If it keeps happening, tell us on the Help page.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">Try again</button>
        <Link href="/help" className="rounded-xl border border-brand-200 bg-white px-5 py-2.5 font-bold text-charcoal-900 hover:bg-brand-100">Help</Link>
      </div>
    </main>
  );
}