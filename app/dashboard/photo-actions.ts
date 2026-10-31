"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { PHOTO_BUCKET } from "../../lib/photo";

type State = { error?: string; ok?: boolean };

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  restaurant_not_found: "Restaurant not found.",
  not_allowed: "Only the restaurant's owner can change its photo.",
  bad_path: "That file name isn't allowed.",
};

// The browser's file type is only a claim, so also check the first bytes of the file.
function looksLike(type: string, b: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b[0] === 0x89 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

function refresh() {
  updateTag("catalog");
  revalidatePath("/dashboard/menu");
}

export async function uploadPhoto(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const file = formData.get("photo");
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (file.size > MAX_BYTES) return { error: "That photo is over 2 MB. Please choose a smaller one." };
  const ext = TYPES[file.type];
  if (!ext) return { error: "Use a JPEG, PNG or WebP photo." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLike(file.type, bytes)) return { error: "That file doesn't look like a real photo." };

  const supabase = await createClient();
  const path = `${restaurantId}/${Date.now()}.${ext}`;
  const upload = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) return { error: "Could not upload. Are you the owner of this restaurant?" };

  const { data: oldPath, error } = await supabase.rpc("set_restaurant_photo", {
    p_restaurant_id: restaurantId,
    p_path: path,
  });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]); // don't leave an orphan file
    return { error: MESSAGES[error.message] ?? "Could not save the photo." };
  }
  if (typeof oldPath === "string" && oldPath) {
    await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
  }

  refresh();
  return { ok: true };
}

export async function removePhoto(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };

  const supabase = await createClient();
  const { data: oldPath, error } = await supabase.rpc("set_restaurant_photo", {
    p_restaurant_id: restaurantId,
    p_path: null,
  });
  if (error) return { error: MESSAGES[error.message] ?? "Could not remove the photo." };
  if (typeof oldPath === "string" && oldPath) {
    await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
  }

  refresh();
  return { ok: true };
}