import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MokaMascot } from "./moka-mascot";

// Put your picture at public/food/spread.jpeg (change the name here if yours is .jpg).
const SPREAD = "/food/spread.jpeg";

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
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <main className="mx-auto w-full max-w-md px-4 py-6">
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

      <section aria-label="Food" className="relative mt-auto pt-10">
        <div className="relative z-10 px-4 text-center">
          <p className="text-lg font-extrabold tracking-tight text-charcoal-900">Hungry already?</p>
          <p className="text-sm text-charcoal-700">Your table is waiting. Log in and let Moka pick.</p>
        </div>
        <div className="relative mt-2 aspect-[1200/420] min-h-44 w-full">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/4"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.35) 0%, rgba(253,186,116,0.2) 45%, transparent 75%)",
            }}
          />
          <Image
            src={SPREAD}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
      </section>
    </div>
  );
}