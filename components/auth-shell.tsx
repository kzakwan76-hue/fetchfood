import Link from "next/link";
import type { ReactNode } from "react";
import { MokaMascot } from "./moka-mascot";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand-600">
        Fetch<span className="text-charcoal-900">Food</span>
      </Link>
      <div className="mt-6 rounded-3xl border border-brand-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <MokaMascot variant="head" size={52} className="shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-900">{title}</h1>
            <p className="text-sm text-charcoal-700">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}