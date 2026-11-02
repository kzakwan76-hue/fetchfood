"use server";

import { createClient } from "../../../lib/supabase/server";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, looksLikeImage } from "../../../lib/image-check";

const BUCKET = "rider-documents";
const KINDS: Record<string, string> = { front: "cnic-front", back: "cnic-back", selfie: "selfie" };

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  not_allowed: "This account type can't apply to be a rider.",
  bad_name: "Every name must be 2 to 80 characters.",
  bad_cnic: "Enter the 13 digits of the CNIC.",
  cnic_used: "That CNIC is already registered.",
  bad_dob: "Riders must be 18 to 70 years old.",
  bad_address: "Enter a full home address.",
  bad_phone: "Enter valid phone numbers for the emergency contact and guarantor.",
  bad_vehicle: "Choose a vehicle and keep the registration under 20 characters.",
  bad_path: "A photo is missing or invalid. Please attach all three again.",
  already_reviewed: "Your application has already been reviewed.",
};

export async function uploadRiderDoc(formData: FormData): Promise<{ error: string } | { path: string }> {
  const prefix = KINDS[String(formData.get("kind") ?? "")];
  const file = formData.get("file");
  if (!prefix) return { error: "Invalid request." };
  if (!(file instanceof File) || file.size === 0) return { error: "Please attach all three photos." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Each photo must be under 2 MB." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Use JPEG, PNG or WebP photos." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeImage(file.type, bytes)) return { error: "One of the files doesn't look like a real photo." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: MESSAGES.not_authenticated };

  const path = `${data.claims.sub}/${prefix}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return { error: "Could not upload a photo. Please try again." };
  return { path };
}

export type ApplicationInput = {
  legalName: string; cnic: string; fatherName: string; dob: string; address: string;
  emergencyName: string; emergencyPhone: string; vehicleType: string; vehicleReg: string;
  guarantorName: string; guarantorPhone: string; front: string; back: string; selfie: string;
};

export async function submitApplication(input: ApplicationInput): Promise<{ error?: string; ok?: boolean }> {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_rider_application", {
    p_legal_name: s(input.legalName),
    p_cnic: s(input.cnic),
    p_father: s(input.fatherName),
    p_dob: s(input.dob) || null,
    p_address: s(input.address),
    p_em_name: s(input.emergencyName),
    p_em_phone: s(input.emergencyPhone),
    p_vehicle_type: s(input.vehicleType),
    p_vehicle_reg: s(input.vehicleReg) || null,
    p_g_name: s(input.guarantorName),
    p_g_phone: s(input.guarantorPhone),
    p_front: s(input.front),
    p_back: s(input.back),
    p_selfie: s(input.selfie),
  });
  if (error) return { error: MESSAGES[error.message] ?? "Could not send your application." };
  return { ok: true };
}