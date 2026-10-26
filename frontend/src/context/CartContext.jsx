/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cart`, {
        withCredentials: true,
      });
      const count = (response.data.cartItems || []).reduce(
        (total, item) => total + (item.quantity || 0),
        0
      );
      setCartCount(count);
    } catch (error) {
      console.error("CART COUNT FETCH ERROR:", error);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCartCount();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshCartCount]);

  const addToCart = async (productId, quantity = 1) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/cart/add`,
      { productId, quantity },
      { withCredentials: true }
    );
    if (typeof response.data.cartCount === "number") {
      setCartCount(response.data.cartCount);
    } else {
      setCartCount((count) => count + quantity);
    }
  };

  return (
    <CartContext.Provider value={{ cartCount, addToCart, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
