"use client";

import { useActionState } from "react";
import { removePhoto, uploadPhoto } from "../app/dashboard/photo-actions";
import { RestaurantBanner } from "./restaurant-banner";

export function RestaurantPhotoCard({
  restaurantId,
  cuisine,
  imageUrl,
}: {
  restaurantId: string;
  cuisine: string;
  imageUrl: string | null;
}) {
  const [upState, upAction, uploading] = useActionState(uploadPhoto, {});
  const [rmState, rmAction, removing] = useActionState(removePhoto, {});
  const error = upState.error ?? rmState.error;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <RestaurantBanner cuisine={cuisine} imageUrl={imageUrl} />
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold text-neutral-900">Cover photo</p>
        <p className="text-sm text-neutral-600">
          JPEG, PNG or WebP, up to 2 MB. A wide photo of your food works best. Without one, customers see a
          coloured banner.
        </p>
        <form action={upAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            required
            className="min-w-0 flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : imageUrl ? "Replace photo" : "Upload photo"}
          </button>
        </form>
        {imageUrl && (
          <form action={rmAction}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <button
              type="submit"
              disabled={removing}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove photo"}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {(upState.ok || rmState.ok) && !error && (
          <p role="status" className="text-sm font-semibold text-green-800">
            Saved. Customers see the change within a few minutes.
          </p>
        )}
      </div>
    </div>
  );
}