import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { CheckoutForm } from "../../components/checkout-form";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/cart" className="text-sm font-semibold text-brand-600">
        ← Cart
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Checkout</h1>
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
        <CheckoutGate />
      </Suspense>
    </main>
  );
}

async function CheckoutGate() {
  await connection(); // before any Supabase auth call (see M3b)
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", data.claims.sub)
    .single();

  return <CheckoutForm defaultPhone={profile?.phone ?? ""} />;
}