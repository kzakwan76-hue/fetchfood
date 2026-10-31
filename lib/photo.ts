export const PHOTO_BUCKET = "restaurant-photos";

// Public URL of a stored photo, or null when the restaurant has none.
export function photoUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}