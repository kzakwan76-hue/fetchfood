"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type Pin = { lat: number; lng: number };

const LAHORE: [number, number] = [31.5204, 74.3587];
const CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const round = (n: number) => Math.round(n * 1e6) / 1e6;

type Leaflet = typeof import("leaflet");

export function LocationPicker({ value, onChange }: { value: Pin | null; onChange: (pin: Pin | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<LeafletMarker | null>(null);
  const lib = useRef<Leaflet | null>(null);
  const change = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    change.current = onChange;
  });

  // Create the map once, in the browser only.
  useEffect(() => {
    let cancelled = false;
    let created: LeafletMap | null = null;
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    const start = async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
      if (cancelled || !box.current) return;
      const m = L.map(box.current, { center: LAHORE, zoom: 12, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(m);
      m.on("click", (e) => change.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
      created = m;
      map.current = m;
      lib.current = L;
      setReady(true);
    };
    void start();
    return () => {
      cancelled = true;
      created?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  // Keep the pin in step with the value.
  useEffect(() => {
    const L = lib.current;
    const m = map.current;
    if (!ready || !L || !m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const icon = L.divIcon({
        html: '<div style="font-size:32px;line-height:32px">📍</div>',
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      const mk = L.marker([value.lat, value.lng], { draggable: true, icon });
      mk.on("dragend", () => {
        const p = mk.getLatLng();
        change.current({ lat: round(p.lat), lng: round(p.lng) });
      });
      mk.addTo(m);
      marker.current = mk;
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
    m.setView([value.lat, value.lng], Math.max(m.getZoom(), 16));
  }, [value, ready]);

  function locate() {
    if (!("geolocation" in navigator)) {
      setNote("This browser can't share a location. Tap the map to place the pin.");
      return;
    }
    setNote(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) });
        setNote(`Location found (accurate to about ${Math.round(pos.coords.accuracy)} m). Drag the pin if it is off.`);
      },
      () => {
        setLocating(false);
        setNote("Could not get your location. Allow location access, or tap the map to place the pin.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal-900 hover:bg-brand-100 disabled:opacity-60"
        >
          {locating ? "Finding you…" : "📍 Use my current location"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setNote(null);
            }}
            className="text-sm font-semibold text-neutral-700 underline"
          >
            Remove pin
          </button>
        )}
      </div>
      <div ref={box} className="relative isolate z-0 h-64 w-full overflow-hidden rounded-xl border border-brand-200 bg-brand-100" />
      <p className="text-xs text-neutral-600">
        {value ? "Drag the pin or tap the map to fix it." : "Tap the map to drop a pin where the food should come."}
      </p>
      {note && <p role="status" className="text-sm text-neutral-800">{note}</p>}
    </div>
  );
}