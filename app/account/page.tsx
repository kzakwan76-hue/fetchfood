import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../auth/actions";
import { connection } from "next/server";

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-600">
        ← Restaurants
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Your account</h1>
      {/* The part that reads cookies must sit inside Suspense (cacheComponents). */}
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  await connection(); // must be awaited, and must come BEFORE any Supabase call
  const supabase = await createClient();

  // getClaims() verifies the token. Never use getSession() for this check.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // RLS means this can only ever return the logged-in user's own row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", claims.sub)
    .single();

  return (
    <div className="mt-6 space-y-4">
      <dl className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
        <Row label="Name" value={profile?.full_name} />
        <Row label="Phone" value={profile?.phone} />
        <Row label="Email" value={claims.email} />
        <Row label="Role" value={profile?.role} />
      </dl>
      {!profile && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Profile row not found. The sign-up trigger from M3a may not have run.
        </p>
      )}
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-semibold text-neutral-800 hover:border-brand-500"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 p-4">
      <dt className="text-sm text-neutral-600">{label}</dt>
      <dd className="font-medium text-neutral-900">{value ?? "—"}</dd>
    </div>
  );
}