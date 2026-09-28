import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { API_BASE_URL } from '../../config/api';

const CartSidebar: React.FC = () => {
  const API_BASE = API_BASE_URL;
  const { 
    isOpen, 
    items, 
    totalItems, 
    totalPrice, 
    toggleCart, 
    // removeFromCart,
    // updateQuantity
  } = useCart();

  // Auto-cierre del sidebar después de 5 segundos
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        toggleCart();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, toggleCart]);

  if (!isOpen) return null;

  return (
    <>
      {/* Panel del carrito - estilo Amazon sin overlay de fondo */}
      <div className="fixed top-16 right-2 sm:right-4 w-72 sm:w-80 max-w-sm bg-white shadow-2xl border border-gray-200 rounded-lg z-50 transform transition-all duration-300 ease-in-out max-h-[calc(100vh-5rem)] overflow-hidden">{/* Responsive: ajuste de posición y tamaño */}
        {/* Header del carrito */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-green-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Agregado al carrito</span>
          </div>
          <button
            onClick={toggleCart}
            className="text-gray-500 hover:text-gray-700 p-1 transition-colors"
            aria-label="Cerrar carrito"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Contenido del carrito */}
        <div className="flex flex-col h-full">
          {items.length === 0 ? (
            /* Carrito vacío */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="text-gray-300 mb-4">
                <circle cx={9} cy={21} r={1}></circle>
                <circle cx={20} cy={21} r={1}></circle>
                <path d="m1 1 4 4 14 1-1 7H6"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-600 mb-2">Tu carrito está vacío</h3>
              <p className="text-gray-500 mb-4">Añade algunos productos para empezar</p>
              <button
                onClick={toggleCart}
                className="px-6 py-2 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] transition-colors cursor-pointer"
              >
                Continuar comprando
              </button>
            </div>
          ) : (
            <>
              {/* Lista de productos */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-3">
                  {items.slice(-3).map((item) => {
                    const imgUrl = item.imageUrl 
                      ? (
                          item.imageUrl.startsWith('http') ||
                          item.imageUrl.startsWith('/assets') ||
                          item.imageUrl.startsWith('blob:')
                            ? item.imageUrl
                            : `${API_BASE}${item.imageUrl}`
                        )
                      : "/assets/imgs/placeholder.svg";
                    return (
                    <div key={item.id} className="flex items-start gap-3 p-2 border-b border-gray-100 last:border-b-0">
                      {/* Imagen del producto */}
                      <div className="flex-shrink-0 w-12 h-12 bg-white rounded overflow-hidden border">
                        <img
                          src={imgUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium text-gray-900 line-clamp-2 mb-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--Primary_5)] font-semibold">
                            S/ {Number(item.price).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Cant: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen y botones */}
              <div className="border-t border-gray-200 p-3 bg-white">
                {/* Subtotal */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-700">Subtotal ({totalItems} productos):</span>
                  <span className="text-lg font-bold text-gray-900">
                    S/ {Number(totalPrice).toFixed(2)}
                  </span>
                </div>

                {/* Envio gratis */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                    <div 
                      className="bg-green-500 h-1 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((totalPrice / 200) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 text-center">
                    {totalPrice >= 200 ? (
                      <span className="text-green-600 font-medium">✓ Tu pedido califica para envío gratis y priorizado</span>
                    ) : (
                      <span>
                        Agrega S/ {(200 - totalPrice).toFixed(2)} más para <span className="text-green-600 font-medium">Envío gratis</span>
                      </span>
                    )}
                  </p>
                </div>

                {/* Botón Ir al carrito */}
                <Link 
                  to="/cart" 
                  onClick={toggleCart}
                  className="w-full bg-[var(--Primary_5)] text-white py-2 px-4 rounded text-center font-medium hover:bg-[#1e4a6f] transition-colors block text-sm"
                >
                  Ir al Carrito
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartSidebar;
