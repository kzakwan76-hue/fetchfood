import { useSyncExternalStore } from "react";
import { EMPTY_CART, parseCart, type Cart } from "./cart";

const STORAGE_KEY = "fetchfood-cart-v1";
const listeners = new Set<() => void>();
let current: Cart = EMPTY_CART;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = parseCart(JSON.parse(raw));
  } catch {
    // private mode or bad JSON: start with an empty cart
  }
}

export function getCart(): Cart {
  load();
  return current;
}

export function setCart(next: Cart) {
  load();
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: the cart still works until the page closes
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The server snapshot is always empty, so server and first browser render match.
export function useCart(): Cart {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY_CART);
}