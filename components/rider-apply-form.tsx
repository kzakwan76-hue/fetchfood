"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { submitApplication, uploadRiderDoc } from "../app/rider/apply/actions";
import { shrinkImage } from "../lib/shrink-image";

const input = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const label = "block text-sm font-medium text-neutral-800";
const text = (data: FormData, name: string) => String(data.get(name) ?? "");

export function RiderApplyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const paths: Record<string, string> = {};
      for (const kind of ["front", "back", "selfie"]) {
        const file = data.get(kind);
        if (!(file instanceof File) || file.size === 0) throw new Error("Please attach all three photos.");
        const fd = new FormData();
        fd.set("kind", kind);
        fd.set("file", await shrinkImage(file));
        const result = await uploadRiderDoc(fd);
        if ("error" in result) throw new Error(result.error);
        paths[kind] = result.path;
      }
      const out = await submitApplication({
        legalName: text(data, "legalName"), cnic: text(data, "cnic"), fatherName: text(data, "fatherName"),
        dob: text(data, "dob"), address: text(data, "address"), emergencyName: text(data, "emergencyName"),
        emergencyPhone: text(data, "emergencyPhone"), vehicleType: text(data, "vehicleType"),
        vehicleReg: text(data, "vehicleReg"), guarantorName: text(data, "guarantorName"),
        guarantorPhone: text(data, "guarantorPhone"), front: paths.front, back: paths.back, selfie: paths.selfie,
      });
      if (out.error) throw new Error(out.error);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
         ? err.message
         : "Could not reach the server. Check your connection, use smaller photos and try again.",
);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <label className={label}>Full name (as on your CNIC)
        <input name="legalName" required maxLength={80} className={input} />
      </label>
      <label className={label}>CNIC number
        <input name="cnic" required inputMode="numeric" placeholder="12345-1234567-1" maxLength={15} className={input} />
      </label>
      <label className={label}>Father&apos;s name
        <input name="fatherName" required maxLength={80} className={input} />
      </label>
      <label className={label}>Date of birth
        <input name="dob" type="date" required className={input} />
      </label>
      <label className={label}>Home address
        <textarea name="address" rows={3} required minLength={10} maxLength={250} className={input} />
      </label>
      <label className={label}>Emergency contact name
        <input name="emergencyName" required maxLength={80} className={input} />
      </label>
      <label className={label}>Emergency contact phone
        <input name="emergencyPhone" type="tel" required className={input} />
      </label>
      <label className={label}>Guarantor name (someone who vouches for you)
        <input name="guarantorName" required maxLength={80} className={input} />
      </label>
      <label className={label}>Guarantor phone
        <input name="guarantorPhone" type="tel" required className={input} />
      </label>
      <label className={label}>Vehicle
        <select name="vehicleType" defaultValue="bike" className={input}>
          <option value="bike">Motorbike</option>
          <option value="bicycle">Bicycle</option>
          <option value="car">Car</option>
        </select>
      </label>
      <label className={label}>Vehicle registration number (if any)
        <input name="vehicleReg" maxLength={20} className={input} />
      </label>
      <p className="text-sm text-neutral-700">Photos (JPEG, PNG or WebP, under 2 MB each). Only FetchFood admins can see them.</p>
      <label className={label}>CNIC front
        <input name="front" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-sm" />
      </label>
      <label className={label}>CNIC back
        <input name="back" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-sm" />
      </label>
      <label className={label}>A clear selfie of your face
        <input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-sm" />
      </label>
      <label className="flex items-start gap-2 text-sm text-neutral-800">
        <input type="checkbox" required className="mt-1" />
        <span>
          I have read and accept the{" "}
          <a href="/rider-agreement" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 underline">Rider agreement</a> and the{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 underline">Privacy policy</a>.
        </span>
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand-600 px-4 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {busy ? "Uploading… please wait" : "Send application"}
      </button>
    </form>
  );
}