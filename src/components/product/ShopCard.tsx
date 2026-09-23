import React, { useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "../../config/api";

export type Product = {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  stock?: number;
  category?: string;
};

export const ShopCard: React.FC<{ product: Product; onAddToCart?: (product: Product) => void }> = ({
  product,
  onAddToCart,
}) => {
  const API_BASE = API_BASE_URL;
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const imageUrl = product.imageUrl
    ? product.imageUrl.startsWith("http") ||
      product.imageUrl.startsWith("/assets") ||
      product.imageUrl.startsWith("blob:")
      ? product.imageUrl
      : `${API_BASE}${product.imageUrl}`
    : "/assets/imgs/placeholder.svg";

  const handleImageError = () => {
    setImgError(true);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <article className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 flex flex-col transition-all duration-200 border border-gray-100">
      {/* Imagen */}
      <div className="aspect-[4/3] w-full mb-3 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
        <img
          src={imgError ? "/assets/imgs/placeholder.svg" : imageUrl}
          alt={product.name}
          className="object-cover h-full w-full hover:scale-105 transition-transform duration-300"
          onError={handleImageError}
        />
      </div>

      {/* Título y descripción */}
      <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
      <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">{product.description || "Sin descripción"}</p>

      {/* Precio */}
      <div className="text-lg font-bold text-[var(--Primary_5)] mb-2">
        S/ {Number(product.price).toFixed(2)}
      </div>

      {/* Advertencia de stock */}
      {product.stock !== undefined && product.stock < 10 && product.stock > 0 && (
        <div className="text-xs text-orange-600 font-medium mb-3 flex items-center gap-1">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          ¡Solo quedan {product.stock}!
        </div>
      )}
      {product.stock !== undefined && product.stock === 0 && (
        <div className="text-xs text-red-600 font-medium mb-3 flex items-center gap-1">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Agotado
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={handleAddToCart}
          className="w-full px-3 py-2 bg-[var(--Primary_5)] text-white text-sm rounded-lg font-medium hover:bg-[var(--Primary_4)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label={`Añadir ${product.name} al carrito`}
          disabled={product.stock !== undefined && product.stock <= 0}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="m1 1 4 4 14 1-1 7H6" />
          </svg>
          {product.stock !== undefined && product.stock <= 0 ? "Agotado" : "Añadir al carrito"}
        </button>
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setShowDetails(true);
          }}
          className="w-full px-3 py-1.5 border border-[var(--Primary_5)] text-[var(--Primary_5)] text-sm rounded-lg font-medium hover:bg-[var(--Primary_5)] hover:text-white transition-colors cursor-pointer"
          aria-label={`Ver detalles de ${product.name}`}
        >
          Ver detalles
        </button>
      </div>

      {/* Modal de detalles */}
      {showDetails &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowDetails(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Cerrar detalles"
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 p-2 rounded-full bg-white/80 hover:bg-white shadow transition cursor-pointer"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className="md:flex items-stretch">
                <div className="md:w-1/2 bg-gray-50 p-6 flex items-center justify-center">
                  <img
                    src={imgError ? "/assets/imgs/placeholder.svg" : imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-contain"
                    onError={handleImageError}
                  />
                </div>
                <div className="md:w-1/2 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
                    <div className="text-2xl font-extrabold text-[var(--Primary_5)] mb-3">
                      S/ {Number(product.price).toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{product.description || "Sin descripción disponible"}</p>
                    {product.stock !== undefined && (
                      <p className="text-xs text-gray-500 mb-2">
                        Stock: <span className="font-semibold text-gray-800">{product.stock} unidades</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleAddToCart(e);
                      setShowDetails(false);
                    }}
                    className="w-full mt-4 px-4 py-2.5 bg-[var(--Primary_5)] text-white rounded-lg font-semibold hover:bg-[var(--Primary_4)] transition-colors cursor-pointer disabled:opacity-50"
                    disabled={product.stock !== undefined && product.stock <= 0}
                  >
                    {product.stock !== undefined && product.stock <= 0 ? "Agotado" : "Añadir al carrito"}
                  </button>
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
