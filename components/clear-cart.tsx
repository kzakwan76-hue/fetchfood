"use client";

import { useEffect } from "react";
import { EMPTY_CART } from "../lib/cart";
import { setCart } from "../lib/cart-store";

// Rendered on the order confirmation page: the order is placed, so the cart is emptied.
export function ClearCart() {
  useEffect(() => {
    setCart(EMPTY_CART);
  }, []);
  return null;
}