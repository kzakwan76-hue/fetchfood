import { useSyncExternalStore } from "react";

// The restaurant card nearest the middle of the screen. dy = how far above (negative) or below the
// Ask Moka button it is, as a fraction of the screen height.
export type PeekFocus = { name: string; dy: number } | null;

let current: PeekFocus = null;
const listeners = new Set<() => void>();

export function setPeek(next: PeekFocus): void {
  const same =
    current === next ||
    (current !== null && next !== null && current.name === next.name && current.dy === next.dy);
  if (same) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function usePeek(): PeekFocus {
  return useSyncExternalStore(subscribe, () => current, () => null);
}