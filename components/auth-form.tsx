"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "../app/auth/actions";
import type { AuthRole } from "../lib/auth-role";

const initialState: { error?: string } = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";

export function AuthForm({ mode, role = "customer" }: { mode: "login" | "signup"; role?: AuthRole }) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState(isSignup ? signUp : signIn, initialState);
  const otherPage = isSignup ? "/login" : "/signup";
  const otherHref = role === "customer" ? otherPage : `${otherPage}?role=${role}`;

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {/* A landing-page hint only. It never changes anyone's role. */}
      <input type="hidden" name="role" value={role} />
      {isSignup && (
        <>
          <label className="block text-sm font-medium text-neutral-800">
            Full name
            <input name="full_name" type="text" autoComplete="name" required className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            Mobile number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0300 1234567"
              required
              className={inputClass}
            />
          </label>
        </>
      )}
      <label className="block text-sm font-medium text-neutral-800">
        Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-neutral-800">
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
          className={inputClass}
        />
      </label>
      {!isSignup && (
        <p className="text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand-600">
            Forgot your password?
          </Link>
        </p>
      )}
      {isSignup && (
        <label className="flex items-start gap-2 text-sm text-neutral-800">
          <input name="agree" type="checkbox" required className="mt-1" />
          <span>
            I accept the{" "}
            <Link href="/terms" className="font-semibold text-brand-600 underline">Terms</Link> and the{" "}
            <Link href="/privacy" className="font-semibold text-brand-600 underline">Privacy policy</Link>.
          </span>
        </label>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-600 px-4 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
      </button>

      <p className="text-center text-sm text-neutral-600">
        {isSignup ? "Already have an account? " : "New to FetchFood? "}
        <Link href={otherHref} className="font-semibold text-brand-600">
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}