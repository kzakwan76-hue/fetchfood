import Link from "next/link";
import { MokaMascot } from "../components/moka-mascot";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="flex justify-center"><MokaMascot variant="full" size={140} /></div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-charcoal-900">We can&apos;t find that page</h1>
      <p className="mt-2 text-charcoal-700">Moka looked everywhere. The link may be old, or the page may have moved.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/restaurants" className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">See restaurants</Link>
        <Link href="/" className="rounded-xl border border-brand-200 bg-white px-5 py-2.5 font-bold text-charcoal-900 hover:bg-brand-100">Home</Link>
      </div>
    </main>
  );
}