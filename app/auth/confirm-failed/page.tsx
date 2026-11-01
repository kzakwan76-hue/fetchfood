import Link from "next/link";

export const metadata = { title: "Link expired" };

export default function ConfirmFailedPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl border border-brand-200 bg-white p-6 text-center shadow-card">
        <p className="text-3xl" aria-hidden="true">
          📭
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900">
          That link didn&apos;t work
        </h1>
        <p className="mt-2 text-sm text-charcoal-700">
          Confirmation links expire and can only be used once. If you already confirmed, just log in. Otherwise
          sign up again and use the newest email.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-charcoal-900 hover:bg-brand-100"
          >
            Sign up again
          </Link>
        </div>
      </div>
    </main>
  );
}