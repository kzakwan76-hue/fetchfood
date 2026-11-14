export type AuthRole = "customer" | "restaurant" | "rider";
export const AUTH_ROLES: AuthRole[] = ["customer", "restaurant", "rider"];

// Anything unknown becomes "customer". This value only picks a page to land on after login.
// It never grants a role: the database role is set by approved applications and admins only.
export function parseRole(value: string | null | undefined): AuthRole {
  return value === "restaurant" || value === "rider" ? value : "customer";
}

// A fixed list of pages, never a value typed by the user (so there is no open redirect).
export function landingFor(role: AuthRole): string {
  if (role === "rider") return "/rider/apply";
  if (role === "restaurant") return "/dashboard";
  return "/account";
}