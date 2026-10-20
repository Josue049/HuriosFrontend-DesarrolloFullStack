// src/components/ShopCard.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCart } from "../../context/CartContext";
import { getRole, getToken } from "../../utils/token";
import { API_BASE_URL } from "../../config/api";
import {
  getProductReviews,
  submitProductReview,
  type ProductReview,
} from "../../api/reviews";

/**
 * Tipo/Interfaz pública del producto.
 * Exportamos esto para que otras páginas puedan importar el shape del producto.
 */
export type Product = {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  stock?: number;
  category?: string;
};

/**
 * ShopCard: componente que muestra la información principal de un producto,
 * incluyendo el promedio de calificaciones y reseñas almacenadas en MongoDB ("product_reviews").
 */
export const ShopCard: React.FC<{ product: Product }> = ({ product }) => {
  const API_BASE = API_BASE_URL;
  const { addToCart, isOpen, toggleCart } = useCart();
  const isAdmin = getRole() === "ADMINISTRADOR";
  const isLoggedIn = Boolean(getToken());

  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Estado de reseñas en MongoDB
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string>("");
  const [reviewSuccess, setReviewSuccess] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    getProductReviews(product.id).then((summary) => {
      if (mounted) {
        setAverageRating(summary.averageRating || 0);
        setTotalReviews(summary.totalReviews || 0);
        setReviews(summary.reviews || []);
      }
    });
    return () => {
      mounted = false;
    };
  }, [product.id]);

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(true);
    setReviewError("");
    setReviewSuccess("");
    getProductReviews(product.id).then((summary) => {
      setAverageRating(summary.averageRating || 0);
      setTotalReviews(summary.totalReviews || 0);
      setReviews(summary.reviews || []);
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setReviewError("Escribe un comentario breve sobre el producto.");
      return;
    }

    setSubmittingReview(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      const updated = await submitProductReview(product.id, newRating, newComment.trim());
      setAverageRating(updated.averageRating || 0);
      setTotalReviews(updated.totalReviews || 0);
      setReviews(updated.reviews || []);
      setNewComment("");
      setReviewSuccess("¡Tu reseña fue guardada en MongoDB!");
    } catch (err: any) {
      setReviewError(err.message || "No se pudo guardar la reseña.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const imageUrl = product.imageUrl
    ? product.imageUrl.startsWith("http") ||
      product.imageUrl.startsWith("/assets") ||
      product.imageUrl.startsWith("blob:")
      ? product.imageUrl
      : `${API_BASE}${product.imageUrl}`
    : "/assets/imgs/placeholder.svg";

  const handleImageError = () => {
    console.error(`Error cargando imagen para producto ${product.id}:`, imageUrl);
    setImgError(true);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    if (!isOpen) {
      toggleCart();
    }
  };

  const renderStars = (ratingValue: number) => {
    const rounded = Math.round(ratingValue);
    return (
      <span className="inline-flex items-center text-yellow-500 text-sm" aria-label={`${ratingValue} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{star <= rounded ? "★" : "☆"}</span>
        ))}
      </span>
    );
  };

  return (
    <article className="bg-white rounded-lg shadow p-4 flex flex-col transition-transform hover:scale-105">
      {/* Imagen (placeholder si no hay) */}
      <div className="aspect-[4/3] w-full mb-3 overflow-hidden rounded">
        <img
          src={imgError ? "/assets/imgs/placeholder.svg" : imageUrl}
          alt={product.name}
          className="object-cover h-full w-full"
          onError={handleImageError}
        />
      </div>

      {/* Título y calificación */}
      <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
      <div className="flex items-center gap-1.5 mb-1">
        {renderStars(averageRating)}
        <span className="text-xs text-gray-500">
          {totalReviews > 0 ? `${averageRating.toFixed(1)} (${totalReviews})` : "Sin reseñas"}
        </span>
      </div>
      <p className="text-sm text-gray-600 flex-1">{product.description || "Sin descripción"}</p>

      {/* Precio */}
      <div className="text-xl font-bold text-[var(--Primary_5)] mb-2">
        S/ {Number(product.price).toFixed(2)}
      </div>

      {/* Advertencia de stock bajo */}
      {product.stock !== undefined && product.stock < 10 && product.stock > 0 && (
        <div className="text-sm text-orange-600 font-medium mb-2 flex items-center gap-1">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          ¡Solo quedan {product.stock}!
        </div>
      )}
      {product.stock !== undefined && product.stock === 0 && (
        <div className="text-sm text-red-600 font-medium mb-2 flex items-center gap-1">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Agotado
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleAddToCart}
          className="w-full px-4 py-2 bg-[var(--Primary_5)] text-white rounded-md font-medium hover:bg-[#1e4a6f] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--Primary_5)]"
          aria-label={`Añadir ${product.name} al carrito`}
          disabled={isAdmin || (product.stock !== undefined && product.stock <= 0)}
          title={isAdmin ? "Los administradores no pueden comprar" : undefined}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={9} cy={21} r={1}></circle>
            <circle cx={20} cy={21} r={1}></circle>
            <path d="m1 1 4 4 14 1-1 7H6"></path>
          </svg>
          {isAdmin
            ? "Solo para clientes"
            : product.stock !== undefined && product.stock <= 0
            ? "Agotado"
            : "Añadir al carrito"}
        </button>
        <button
          onClick={handleOpenDetails}
          className="w-full px-4 py-2 border border-[var(--Primary_5)] text-[var(--Primary_5)] rounded-md font-medium hover:bg-[var(--Primary_5)] hover:text-white transition-colors"
          aria-label={`Ver detalles de ${product.name}`}
        >
          Ver detalles y reseñas
        </button>
      </div>

      {showDetails &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowDetails(false)}
          >
            <div
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Cerrar detalles"
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 p-2 rounded-full bg-white/80 hover:bg-white z-10 cursor-pointer"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className="md:flex md:gap-6 items-start">
                <div className="md:w-2/5 w-full flex items-center justify-center bg-gray-50 p-4">
                  <img
                    src={imgError ? "/assets/imgs/placeholder.svg" : imageUrl}
                    alt={product.name}
                    className="w-full h-auto max-h-[24rem] object-contain"
                    onError={handleImageError}
                  />
                </div>
                <div className="md:w-3/5 w-full p-6 flex flex-col gap-3">
                  <h2 className="text-2xl font-semibold">{product.name}</h2>
                  <div className="flex items-center gap-2">
                    {renderStars(averageRating)}
                    <span className="text-sm text-gray-600">
                      {totalReviews > 0
                        ? `${averageRating.toFixed(1)} de 5 (${totalReviews} ${
                            totalReviews === 1 ? "reseña" : "reseñas"
                          })`
                        : "Aún sin reseñas"}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--Primary_5)]">
                    S/ {Number(product.price).toFixed(2)}
                  </div>

                  {product.stock !== undefined && product.stock < 10 && product.stock > 0 && (
                    <div className="text-sm text-orange-600 font-medium flex items-center gap-2 bg-orange-50 p-2.5 rounded-md">
                      ¡Solo quedan {product.stock} unidades!
                    </div>
                  )}
                  {product.stock !== undefined && product.stock === 0 && (
                    <div className="text-sm text-red-600 font-medium flex items-center gap-2 bg-red-50 p-2.5 rounded-md">
                      Producto agotado
                    </div>
                  )}

                  <p className="text-sm text-gray-700">{product.description || "Sin descripción"}</p>

                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleAddToCart(e);
                      setShowDetails(false);
                    }}
                    className="w-full px-6 py-2.5 bg-[var(--Primary_5)] text-white rounded-md font-medium hover:bg-[#1e4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={isAdmin || (product.stock !== undefined && product.stock <= 0)}
                  >
                    {isAdmin
                      ? "Solo para clientes"
                      : product.stock !== undefined && product.stock <= 0
                      ? "Agotado"
                      : "Añadir al carrito"}
                  </button>

                  {/* Sección de Reseñas en MongoDB */}
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      Opiniones de Clientes ({totalReviews})
                    </h3>

                    {isLoggedIn && !isAdmin ? (
                      <form onSubmit={handleReviewSubmit} className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">Tu calificación:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                className={`text-lg cursor-pointer ${
                                  star <= newRating ? "text-yellow-500" : "text-gray-300"
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Comparte tu experiencia con este repuesto..."
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-[var(--Primary_5)]"
                        />
                        {reviewError && <p className="text-xs text-red-600 mt-1">{reviewError}</p>}
                        {reviewSuccess && <p className="text-xs text-green-600 mt-1">{reviewSuccess}</p>}
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="mt-2 px-4 py-1.5 bg-[var(--Primary_5)] text-white text-xs font-medium rounded hover:bg-[#1e4a6f] disabled:opacity-50 cursor-pointer"
                        >
                          {submittingReview ? "Guardando..." : "Publicar reseña"}
                        </button>
                      </form>
                    ) : !isLoggedIn ? (
                      <p className="text-xs text-gray-500 mb-3">
                        Inicia sesión como cliente para calificar y dejar una reseña.
                      </p>
                    ) : null}

                    <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                      {reviews.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          Sé el primero en opinar sobre este producto.
                        </p>
                      ) : (
                        reviews.map((rev) => (
                          <div key={rev.id} className="bg-white border border-gray-100 rounded-md p-2.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-800">{rev.userName}</span>
                              {renderStars(rev.rating)}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{rev.comment}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </article>
  );
};

export default ShopCard;
