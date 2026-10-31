import { AuthForm } from "../../components/auth-form";
import { AuthShell } from "../../components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to order and track your food.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}