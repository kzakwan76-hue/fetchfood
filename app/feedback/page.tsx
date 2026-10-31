import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { FeedbackForm } from "../../components/feedback-form";
import { Skeleton } from "../../components/skeleton";
import { createClient } from "../../lib/supabase/server";

export const metadata = { title: "Feedback" };

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/account" className="text-sm font-semibold text-brand-700">
        ← Account
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-charcoal-900">Tell us what you think</h1>
      <p className="mt-1 text-charcoal-700">Ideas, problems and praise all help us build a better FetchFood.</p>
      <Suspense fallback={<Skeleton className="mt-4 h-64 w-full" />}>
        <FeedbackGate />
      </Suspense>
    </main>
  );
}

async function FeedbackGate() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return <FeedbackForm />;
}