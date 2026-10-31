import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { CheckoutForm } from "../../components/checkout-form";
import { FlowSteps } from "../../components/flow-steps";
import { Skeleton } from "../../components/skeleton";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <Link href="/cart" className="text-sm font-semibold text-brand-700">
        ← Cart
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal-900">Checkout</h1>
      <FlowSteps current={2} />
      <Suspense fallback={<Skeleton className="mt-6 h-72 w-full" />}>
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