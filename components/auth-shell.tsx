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
    <div className="flex min-h-dvh flex-col bg-linear-to-b from-brand-600 via-brand-500 to-brand-400">
      <header className="flex flex-col items-center px-6 pb-8 pt-10 text-center">
        <MokaMascot variant="head" size={64} />
        <Link href="/" className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          FetchFood
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 rounded-t-[2rem] bg-white px-6 pb-10 pt-8 shadow-lift">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-charcoal-900">{title}</h1>
        <p className="mt-1 text-center text-sm text-charcoal-700">{subtitle}</p>
        {children}
      </main>
    </div>
  );
}