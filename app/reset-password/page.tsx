import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "../../components/auth-shell";
import { ResetForm } from "../../components/recovery-forms";
import { Skeleton } from "../../components/skeleton";
import { createClient } from "../../lib/supabase/server";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="Pick something at least 8 characters long.">
      <Suspense fallback={<Skeleton className="mt-6 h-40 w-full" />}>
        <Gate />
      </Suspense>
    </AuthShell>
  );
}

async function Gate() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // Only reachable through a valid reset link, which signs the person in briefly.
  if (!data?.claims) redirect("/auth/confirm-failed");
  return <ResetForm />;
}