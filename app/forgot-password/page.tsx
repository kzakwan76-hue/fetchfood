import Link from "next/link";
import { AuthShell } from "../../components/auth-shell";
import { ForgotForm } from "../../components/recovery-forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <ForgotForm />
      <p className="mt-4 text-sm text-neutral-600">
        <Link href="/login" className="font-semibold text-brand-600">Back to log in</Link>
      </p>
    </AuthShell>
  );
}