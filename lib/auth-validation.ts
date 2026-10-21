// Pure functions with no imports, so scripts\test-auth.mjs can test them directly.

export function validateFullName(name: string): string | null {
  return name.trim().length >= 2 ? null : "Please enter your full name.";
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  return password.length >= 8 ? null : "Password must be at least 8 characters.";
}