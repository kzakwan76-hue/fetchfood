import Link from "next/link";
import { AuthForm } from "../../components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/" className="text-sm font-semibold text-brand-600">
        ← FetchFood
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Log in</h1>
      <AuthForm mode="login" />
    </main>
  );
}