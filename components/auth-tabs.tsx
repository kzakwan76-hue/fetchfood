"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AUTH_ROLES, parseRole, type AuthRole } from "../lib/auth-role";
import { AuthForm } from "./auth-form";

const TABS: Record<AuthRole, { label: string; emoji: string }> = {
  customer: { label: "Customer", emoji: "👤" },
  restaurant: { label: "Restaurant", emoji: "🍽️" },
  rider: { label: "Rider", emoji: "🛵" },
};

function PartnerCard() {
  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-charcoal-800">
      <p className="font-bold text-charcoal-900">Partner with FetchFood</p>
      <p className="mt-1">
        Restaurant accounts are set up by our team so we can check your kitchen first. Read the{" "}
        <Link href="/restaurant-agreement" className="font-semibold text-brand-700 underline">restaurant agreement</Link>,
        then contact us from the{" "}
        <Link href="/help" className="font-semibold text-brand-700 underline">Help page</Link>.
      </p>
      <p className="mt-3">
        Already have an owner account?{" "}
        <Link href="/login?role=restaurant" className="font-semibold text-brand-700 underline">Log in</Link>
      </p>
    </div>
  );
}

export function AuthTabs({ mode }: { mode: "login" | "signup" }) {
  const role = parseRole(useSearchParams().get("role"));

  return (
    <>
      <nav aria-label="Account type" className="mt-6 grid grid-cols-3 gap-2">
        {AUTH_ROLES.map((r) => {
          const active = r === role;
          return (
            <Link
              key={r}
              href={r === "customer" ? `/${mode}` : `/${mode}?role=${r}`}
              replace
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-sm font-semibold ${
                active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-charcoal-700"
              }`}
            >
              <span aria-hidden="true" className={`text-2xl ${active ? "" : "opacity-60 grayscale"}`}>{TABS[r].emoji}</span>
              {TABS[r].label}
            </Link>
          );
        })}
      </nav>

      {role === "rider" && (
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-charcoal-800">
          {mode === "signup"
            ? "Create your account first. Next you'll fill in the rider application (CNIC and photos)."
            : "Log in to continue your rider application or open your deliveries."}
        </p>
      )}
      {role === "restaurant" && mode === "login" && (
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-charcoal-800">
          Log in with your owner account to open your dashboard.
        </p>
      )}

      {role === "restaurant" && mode === "signup" ? <PartnerCard /> : <AuthForm mode={mode} role={role} />}
    </>
  );
}