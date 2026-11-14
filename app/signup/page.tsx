import { Suspense } from "react";
import { AuthShell } from "../../components/auth-shell";
import { AuthTabs } from "../../components/auth-tabs";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Let's get started" subtitle="Create an account to order food, track orders and more.">
      <Suspense fallback={<div className="skeleton mt-6 h-72" />}>
        <AuthTabs mode="signup" />
      </Suspense>
    </AuthShell>
  );
}