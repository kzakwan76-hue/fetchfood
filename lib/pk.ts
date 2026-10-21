/**
 * Pakistan-specific helpers shared by browser and server.
 * Money is ALWAYS whole rupees (integers), so we never hit decimal rounding bugs.
 */

/** Format whole rupees, e.g. 1250 -> "Rs. 1,250". */
export function formatPKR(amount: number): string {
  if (!Number.isFinite(amount)) return "Rs. 0";
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}Rs. ${Math.abs(rounded).toLocaleString("en-PK")}`;
}

/**
 * Turn a Pakistani mobile number into one standard form (+923XXXXXXXXX).
 * Accepts: 0300 1234567, 0300-1234567, 923001234567, +92 300 1234567, 00923001234567.
 * Returns null if it is not a valid Pakistani mobile number.
 */
export function normalizePkPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = /^(?:\+92|0092|92|0)?(3\d{9})$/.exec(digits);
  return match ? `+92${match[1]}` : null;
}

export function isValidPkPhone(input: string): boolean {
  return normalizePkPhone(input) !== null;
}