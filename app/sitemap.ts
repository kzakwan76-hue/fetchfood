import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/restaurants", "/help", "/terms", "/privacy", "/rider-agreement", "/restaurant-agreement", "/signup", "/login"].map(
    (path) => ({ url: `${base}${path}` }),
  );
}