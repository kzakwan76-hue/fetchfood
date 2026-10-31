import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ListSkeleton } from "../../components/skeleton";
import { createClient } from "../../lib/supabase/server";
import { deleteAddress } from "../customer/actions";

export const metadata = { title: "Saved addresses" };

type Row = { id: string; label: string; address: string };

export default function AddressesPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-4 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">Saved addresses</h1>
      <p className="mt-1 text-charcoal-700">Pick one at checkout instead of typing it again. Up to 5.</p>
      <Suspense fallback={<ListSkeleton rows={2} height="h-20" />}>
        <AddressList />
      </Suspense>
    </main>
  );
}

async function AddressList() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data } = await supabase
    .from("saved_addresses")
    .select("id, label, address")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-brand-200 bg-white p-6 text-center shadow-card">
        <p className="font-bold text-charcoal-900">No saved addresses yet</p>
        <p className="mt-1 text-sm text-charcoal-700">
          Tick &ldquo;Save this address&rdquo; at checkout and it will show up here.
        </p>
        <Link href="/restaurants" className="mt-4 inline-block font-bold text-brand-700 underline">
          Find something to eat
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-5 space-y-3">
      {rows.map((a) => (
        <li key={a.id} className="rounded-3xl border border-brand-200 bg-white p-4 shadow-card">
          <p className="font-bold text-charcoal-900">{a.label}</p>
          <p className="mt-1 text-sm text-charcoal-800">{a.address}</p>
          <form action={deleteAddress} className="mt-3">
            <input type="hidden" name="id" value={a.id} />
            <button type="submit" className="text-sm font-semibold text-red-700 underline">
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}