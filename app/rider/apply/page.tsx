import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RiderApplyForm } from "../../../components/rider-apply-form";
import { ListSkeleton } from "../../../components/skeleton";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Ride with us" };

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-4 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">Ride with FetchFood</h1>
      <p className="mt-1 text-charcoal-700">Riders keep the whole delivery fee. You hand in all the cash you collect, and we pay your earnings. A refundable security deposit of Rs. 500 is collected when you are approved. We verify every rider before their first order.</p>
      <Suspense fallback={<ListSkeleton rows={2} height="h-40" />}>
        <Apply />
      </Suspense>
    </main>
  );
}

async function Apply() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", claims.claims.sub).single();
  if (me?.role !== "customer" && me?.role !== "rider") {
    return <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-charcoal-700 shadow-card">This account type can&apos;t apply to ride. Use a customer account.</p>;
  }

  const { data } = await supabase.rpc("rider_my_application");
  const app = ((data ?? []) as { m_status: string; m_note: string | null; m_name: string }[])[0];
  const box = "mt-6 rounded-3xl border border-brand-200 bg-white p-5 text-sm shadow-card";

  if (app?.m_status === "pending") {
    return <div className={box}><p className="font-bold text-charcoal-900">Application under review</p><p className="mt-1 text-charcoal-700">Thanks, {app.m_name}. We may call you or your guarantor. You&apos;ll get a notification when it&apos;s decided.</p></div>;
  }
  if (app?.m_status === "approved") {
    return <div className={box}><p className="font-bold text-green-800">You&apos;re approved</p><Link href="/rider" className="mt-2 inline-block font-bold text-brand-700 underline">Open rider deliveries</Link></div>;
  }
  if (app?.m_status === "suspended") {
    return <div className={box}><p className="font-bold text-red-700">Your rider account is suspended</p><p className="mt-1 text-charcoal-700">Please contact FetchFood.{app.m_note ? ` Note: ${app.m_note}` : ""}</p></div>;
  }

  return (
    <>
      {app?.m_status === "rejected" && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">Your last application was not accepted{app.m_note ? `: ${app.m_note}` : "."} You can fix the details and apply again.</p>
      )}
      <RiderApplyForm />
    </>
  );
}