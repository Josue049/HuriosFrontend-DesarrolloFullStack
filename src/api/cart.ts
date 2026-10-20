// src/api/cart.ts
import { API_BASE_URL } from "../config/api";
import { getToken } from "../utils/token";
import { type CartItem } from "../context/CartContext";

const API_BASE = API_BASE_URL;

export interface CartResponse {
  id?: string;
  userEmail: string;
  userId?: number;
  items: CartItem[];
  updatedAt?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchCartApi(): Promise<CartItem[] | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/cart`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const data: CartResponse = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.warn("No se pudo obtener el carrito desde MongoDB:", err);
    return null;
  }
}

export async function updateCartApi(items: CartItem[]): Promise<CartItem[] | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/cart`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    if (!res.ok) return null;
    const data: CartResponse = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.warn("No se pudo sincronizar el carrito con MongoDB:", err);
    return null;
  }
}

export async function mergeCartApi(items: CartItem[]): Promise<CartItem[] | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/cart/merge`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    if (!res.ok) return null;
    const data: CartResponse = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.warn("No se pudo fusionar el carrito con MongoDB:", err);
    return null;
  }
}

export async function clearCartApi(): Promise<void> {
  const token = getToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE}/cart`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  } catch (err) {
    console.warn("No se pudo vaciar el carrito en MongoDB:", err);
  }
}
