"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "../app/auth/actions";

const initialState: { error?: string } = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState(isSignup ? signUp : signIn, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
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

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
      </button>

      <p className="text-sm text-neutral-600">
        {isSignup ? "Already have an account? " : "New to FetchFood? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-brand-600">
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}