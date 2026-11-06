import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DeleteForm, ProfileForm } from "../../../components/profile-forms";
import { Skeleton } from "../../../components/skeleton";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Edit profile" };

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-4 pb-24">
      <Link href="/account" className="text-sm font-semibold text-brand-700">← Account</Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal-900">Edit profile</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-64 w-full" />}>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Profile() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", data.claims.sub)
    .single();

  return (
    <div className="mt-5 space-y-6">
      <section className="rounded-3xl border border-brand-200 bg-white p-5 shadow-card">
        <ProfileForm name={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
      </section>
      <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-card">
        <h2 className="mb-2 text-lg font-bold text-red-700">Delete my account</h2>
        <DeleteForm />
      </section>
    </div>
  );
}