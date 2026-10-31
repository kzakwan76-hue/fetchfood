import { useSyncExternalStore } from "react";

export type ChosenZone = { id: string; name: string };

const KEY = "fetchfood-zone-v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: ChosenZone | null = null;
let primed = false;

// Never trust localStorage: anything odd becomes "no zone chosen".
function parse(raw: string | null): ChosenZone | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data.id === "string" && /^[0-9a-f-]{36}$/i.test(data.id) && typeof data.name === "string") {
      return { id: data.id, name: data.name.slice(0, 60) };
    }
  } catch {
    // corrupt value: fall through to null
  }
  return null;
}

export function getZone(): ChosenZone | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // storage blocked: behave as if nothing is chosen
  }
  if (!primed || raw !== cachedRaw) {
    primed = true;
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

export function setZone(zone: ChosenZone | null): void {
  try {
    if (zone) window.localStorage.setItem(KEY, JSON.stringify(zone));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the change just won't persist
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useZone(): ChosenZone | null {
  return useSyncExternalStore(subscribe, getZone, () => null);
}

const noSubscription = () => () => {};

/** false while rendering on the server and during the first client render, then true. Stops the "pick an area" flash. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}