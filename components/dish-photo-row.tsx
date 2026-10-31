"use client";

import Image from "next/image";
import { useActionState } from "react";
import { removeDishPhoto, uploadDishPhoto } from "../app/dashboard/photo-actions";

export function DishPhotoRow({
  itemId,
  name,
  imageUrl,
}: {
  itemId: string;
  name: string;
  imageUrl: string | null;
}) {
  const [upState, upAction, uploading] = useActionState(uploadDishPhoto, {});
  const [rmState, rmAction, removing] = useActionState(removeDishPhoto, {});
  const error = upState.error ?? rmState.error;

  return (
    <li className="flex gap-3 p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-100">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-full items-center justify-center text-2xl">
            🍽️
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
        <form action={upAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="itemId" value={itemId} />
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            required
            aria-label={`Photo for ${name}`}
            className="min-w-0 flex-1 text-xs"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {uploading ? "…" : imageUrl ? "Replace" : "Upload"}
          </button>
        </form>
        {imageUrl && (
          <form action={rmAction}>
            <input type="hidden" name="itemId" value={itemId} />
            <button
              type="submit"
              disabled={removing}
              className="text-xs font-semibold text-neutral-700 underline disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove photo"}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}