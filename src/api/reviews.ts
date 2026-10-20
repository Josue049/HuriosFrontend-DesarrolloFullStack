// src/api/reviews.ts
import { API_BASE_URL } from "../config/api";
import { getToken, handleUnauthorizedResponse } from "../utils/token";

const API_BASE = API_BASE_URL;

export interface ProductReview {
  id: string;
  productId: number;
  userId?: number;
  userEmail?: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductReviewsSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
  reviews: ProductReview[];
  savedReview?: ProductReview;
}

export async function getProductReviews(productId: number): Promise<ProductReviewsSummary> {
  try {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`);
    if (!res.ok) {
      return { productId, averageRating: 0, totalReviews: 0, reviews: [] };
    }
    return await res.json();
  } catch (err) {
    console.warn("No se pudieron cargar las reseñas desde MongoDB:", err);
    return { productId, averageRating: 0, totalReviews: 0, reviews: [] };
  }
}

export async function submitProductReview(
  productId: number,
  rating: number,
  comment: string
): Promise<ProductReviewsSummary> {
  const token = getToken();
  if (!token) {
    throw new Error("Debes iniciar sesión para publicar una reseña");
  }

  const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rating, comment }),
  });

  if (res.status === 401 || res.status === 403) {
    handleUnauthorizedResponse();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || "Error al enviar la reseña");
  }

  return await res.json();
}
