import { Suspense } from "react";
import { AuthShell } from "../../components/auth-shell";
import { AuthTabs } from "../../components/auth-tabs";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to order food, track orders and more.">
      <Suspense fallback={<div className="skeleton mt-6 h-72" />}>
        <AuthTabs mode="login" />
      </Suspense>
    </AuthShell>
  );
}