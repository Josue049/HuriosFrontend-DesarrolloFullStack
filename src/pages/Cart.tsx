import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { useCart } from "../context/CartContext";
import { createPortal } from "react-dom";
import { getToken } from "../utils/token";
import { useRoleProtection } from "../hooks/useRoleProtection";
import { API_BASE_URL } from "../config/api";

export function Cart() {
    useRoleProtection('cart'); // Bloquear acceso a admins
    const API_BASE = API_BASE_URL;
    const navigate = useNavigate();
    const { 
        items, 
        totalItems, 
        totalPrice, 
        removeFromCart, 
        updateQuantity,
        clearCart
    } = useCart();

    // Login modal state
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const [cardName, setCardName] = useState<string>("");
    const [cardNumber, setCardNumber] = useState<string>("");
    const [cardBrand, setCardBrand] = useState<string>('');
    const cardInputRef = useRef<HTMLInputElement | null>(null);
    const expiryInputRef = useRef<HTMLInputElement | null>(null);
    const [expiry, setExpiry] = useState<string>("");
    const [cvc, setCvc] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

    // Lock scroll when modal open
    useEffect(() => {
        if (showPaymentModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showPaymentModal]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowPaymentModal(false);
        };
        if (showPaymentModal) document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showPaymentModal]);

    const sanitizeNumber = (s: string) => s.replace(/\s+/g, '');

    const luhnCheck = (num: string) => {
        const s = sanitizeNumber(num);
        if (!/^[0-9]+$/.test(s)) return false;
        let sum = 0;
        let alt = false;
        for (let i = s.length - 1; i >= 0; i--) {
            let n = parseInt(s.charAt(i), 10);
            if (alt) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alt = !alt;
        }
        return sum % 10 === 0;
    };

    const detectCardBrand = (digits: string) => {
        if (/^4/.test(digits)) return 'visa';
        if (/^(34|37)/.test(digits)) return 'amex';
        if (/^(5[1-5])/.test(digits)) return 'mastercard';
        if (/^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'mastercard';
        return 'unknown';
    };

    const formatByBrand = (digits: string, brand: string) => {
        if (brand === 'amex') {
            // Amex 4-6-5
            return digits.replace(/(\d{1,4})(\d{1,6})?(\d{1,5})?/, (_, g1, g2, g3) => {
                return [g1, g2, g3].filter(Boolean).join(' ').trim();
            }).trim();
        }
        // default 4-4-4-4
        return digits.replace(/(.{4})/g, '$1 ').trim();
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const el = e.target;
        const rawValue = el.value;
        const prevPos = el.selectionStart || 0;
        const digits = rawValue.replace(/\D/g, '');
        const brand = detectCardBrand(digits);
        const formatted = formatByBrand(digits, brand);

        // compute new caret position: count digits to left of prevPos in rawValue
        const digitsBeforeCursor = rawValue.slice(0, prevPos).replace(/\D/g, '').length;
        // find position in formatted corresponding to digitsBeforeCursor
        let newPos = 0;
        let counted = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) counted++;
            newPos++;
            if (counted >= digitsBeforeCursor) break;
        }

        setCardBrand(brand === 'unknown' ? '' : brand);
        setCardNumber(formatted);

        requestAnimationFrame(() => {
            const input = cardInputRef.current;
            if (input) {
                input.setSelectionRange(newPos, newPos);
            }
        });
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const el = e.target;
        const raw = el.value;
        const prevPos = el.selectionStart || 0;
        const digits = raw.replace(/\D/g, '');

        let formatted = '';
        if (digits.length <= 2) {
            formatted = digits;
        } else {
            const month = digits.slice(0, 2);
            const rest = digits.slice(2, 6); 
            formatted = month + '/' + rest;
        }

        const digitsBeforeCursor = raw.slice(0, prevPos).replace(/\D/g, '').length;
        let newPos = 0;
        let counted = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) counted++;
            newPos++;
            if (counted >= digitsBeforeCursor) break;
        }

        setExpiry(formatted);
        requestAnimationFrame(() => {
            const input = expiryInputRef.current;
            if (input) input.setSelectionRange(newPos, newPos);
        });
    };

    const validatePayment = () => {
        const e: Record<string, string> = {};
        const numSan = sanitizeNumber(cardNumber);
        if (!numSan) e.cardNumber = 'Número de tarjeta requerido';
        else if (!luhnCheck(numSan)) e.cardNumber = 'Número de tarjeta inválido';
        if (!cardName.trim()) e.cardName = 'Nombre del titular requerido';
        // expiry MM/YY or MM/YYYY
        const expMatch = expiry.match(/^(0[1-9]|1[0-2])\/(?:(\d{2})|(\d{4}))$/);
        if (!expMatch) {
            e.expiry = 'Fecha invalida (MM/AA)';
        } else {
            const month = parseInt(expMatch[1], 10);
            const yearRaw = expMatch[2] || expMatch[3];
            let year = parseInt(yearRaw, 10);
            if (yearRaw.length === 2) {
                const prefix = Math.floor(new Date().getFullYear() / 100) * 100;
                year += prefix;
                // handle century rollover
                if (year < new Date().getFullYear()) year += 100;
            }
            const expDate = new Date(year, month - 1 + 1, 0, 23, 59, 59); // end of month
            if (expDate < new Date()) e.expiry = 'Tarjeta expirada';
        }
    if (!/^[0-9]{3,4}$/.test(cvc)) e.cvc = 'CVC inválido';
    // email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo electrónico inválido';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleProceedToCheckout = () => {
        const token = getToken();
        if (!token) {
            setShowLoginModal(true);
        } else {
            navigate("/checkout");
        }
    };

    const onSubmitPayment = (ev?: React.FormEvent) => {
        ev?.preventDefault();
        if (!validatePayment()) return;
        setPaymentSuccess(true);
        clearCart();
        setTimeout(() => {
            setShowPaymentModal(false);
            setPaymentSuccess(false);
            setCardName(''); setCardNumber(''); setExpiry(''); setCvc(''); setEmail(''); setErrors({});
        }, 1500);
    };

    if (items.length === 0) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-[var(--Primary_0)]">
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="text-center py-16">
                            <svg width={120} height={120} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="mx-auto text-gray-300 mb-6">
                                <circle cx={9} cy={21} r={1}></circle>
                                <circle cx={20} cy={21} r={1}></circle>
                                <path d="m1 1 4 4 14 1-1 7H6"></path>
                            </svg>
                            <h1 className="text-3xl font-bold text-gray-800 mb-4">Tu carrito está vacío</h1>
                            <p className="text-gray-600 mb-8 max-w-md mx-auto">Parece que no has agregado ningún producto a tu carrito aún. Explora nuestros productos y encuentra lo que necesitas.</p>
                            <Link 
                                to="/products" 
                                className="inline-block bg-[var(--Primary_5)] text-white px-8 py-3 rounded-md font-medium hover:bg-[#1e4a6f] transition-colors"
                            >
                                Explorar productos
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[var(--Primary_0)]">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Carrito</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <button 
                                onClick={() => window.history.back()}
                                className="text-[var(--Primary_5)] hover:underline"
                            >
                                ← Continuar comprando
                            </button>
                            <span>|</span>
                            <button 
                                onClick={clearCart}
                                className="text-red-600 hover:underline"
                            >
                                Vaciar carrito
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Lista de productos - Columna principal */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="p-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium text-gray-900">
                                            Productos en tu carrito ({totalItems})
                                        </h2>
                                        <div className="text-sm text-gray-500">
                                            Precio
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-200">
                                    {items.map((item) => {
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
                                        <div key={item.id} className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                {/* Imagen */}
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={imgUrl}
                                                        alt={item.name}
                                                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-gray-200"
                                                    />
                                                </div>

                                                {/* Información del producto */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                                                                {item.name}
                                                            </h3>
                                                            <p className="text-sm text-gray-600">
                                                                {item.description || "Sin descripción"}
                                                            </p>
                                                            <p className="text-sm text-green-600 mt-1">
                                                                En stock
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-gray-900">
                                                                S/ {Number(item.price).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Controles */}
                                                    <div className="flex flex-wrap items-center gap-4 pt-2">
                                                        {/* Cantidad */}
                                                        <div className="flex items-center border border-gray-300 rounded">
                                                            <button
                                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                disabled={item.quantity <= 1}
                                                                aria-label="Disminuir cantidad"
                                                            >
                                                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                                </svg>
                                                            </button>
                                                            <span className="w-12 text-center text-sm font-medium border-x border-gray-300 h-10 flex items-center justify-center">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                disabled={item.stock !== undefined && item.quantity >= item.stock}
                                                                aria-label="Aumentar cantidad"
                                                                title={item.stock !== undefined && item.quantity >= item.stock ? `Stock máximo: ${item.stock}` : ""}
                                                            >
                                                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        <div className="h-4 w-px bg-gray-300"></div>

                                                        {/* Botones de acción */}
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                                                        >
                                                            Eliminar
                                                        </button>

                                                        <button className="text-sm text-[var(--Primary_5)] hover:text-[#1e4a6f] font-medium">
                                                            Guardar para más tarde
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Resumen del pedido - Sidebar derecho */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6 space-y-4">
                                {/* Subtotal */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[16px]">
                                            <span className="font-medium">Subtotal ({totalItems} productos):</span>
                                            <span className="font-bold">S/ {Number(totalPrice).toFixed(2)}</span>
                                        </div>
                                        
                                        {/* Progreso de envio gratis */}
                                        <div className="pt-2">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                                <div 
                                                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                                                    style={{ width: `${Math.min((totalPrice / 200) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {totalPrice >= 200 ? (
                                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                            <path d="m9 12 2 2 4-4"></path>
                                                            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                                                            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                                                            <path d="M3 12h6m6 0h6"></path>
                                                        </svg>
                                                        Tu pedido califica para envío gratis y priorizado
                                                    </span>
                                                ) : (
                                                    <span>
                                                        Agrega <span className="font-semibold">S/ {(200 - totalPrice).toFixed(2)}</span> más para <span className="text-green-600 font-medium">Envío gratis y priorizado</span>
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        
                                        <button onClick={handleProceedToCheckout} className="w-full bg-[var(--Primary_5)] text-white py-3 px-4 rounded-md font-medium hover:bg-[#1e4a6f] transition-colors">
                                            Proceder al pago
                                        </button>
                                        
                                        <p className="text-xs text-gray-500 text-center">
                                            El precio y la disponibilidad pueden cambiar. Los impuestos se calculan en el checkout.
                                        </p>
                                    </div>
                                </div>

                                {/* Promocion Envio Gratis */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-green-500 text-white p-2 rounded-lg">
                                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 mb-1">
                                                Envío Gratis y Priorizado
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Por compras mayores de <span className="font-semibold text-green-700">S/ 200</span>, obten envío completamente gratis y con prioridad en la entrega.
                                            </p>
                                            <div className="text-xs text-gray-500">
                                                {totalPrice >= 200 ? (
                                                    <span className="text-green-600 font-medium">OK !Felicitaciones! Tu pedido califica para envío gratis y priorizado</span>
                                                ) : (
                                                    <span>Te faltan <span className="font-semibold text-green-700">S/ {(200 - totalPrice).toFixed(2)}</span> para calificar</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            {showLoginModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" onClick={() => setShowLoginModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <h3 className="text-xl font-semibold">Inicia sesión para continuar</h3>
                                <button onClick={() => setShowLoginModal(false)} className="text-gray-600 hover:text-gray-800 p-2 rounded-full">
                                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>

                            <div className="mt-6 text-center">
                                <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto text-gray-400 mb-4">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx={12} cy={7} r={4}></circle>
                                </svg>
                                <p className="text-gray-600 mb-6">Debes iniciar sesión para proceder al pago</p>
                                <Link 
                                    to="/login" 
                                    state={{ from: "/cart" }}
                                    className="inline-block w-full bg-[var(--Primary_5)] text-white px-6 py-3 rounded-md font-medium hover:bg-[#1e4a6f] transition-colors"
                                >
                                    Ir al Login
                                </Link>
                                <button 
                                    onClick={() => setShowLoginModal(false)}
                                    className="mt-3 w-full text-gray-600 hover:text-gray-800 px-6 py-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
            {showPaymentModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <h3 className="text-xl font-semibold">Pago con tarjeta</h3>
                                <button onClick={() => setShowPaymentModal(false)} className="text-gray-600 hover:text-gray-800 p-2 rounded-full">
                                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>

                            {!paymentSuccess ? (
                                <form className="mt-4 space-y-4" onSubmit={onSubmitPayment}>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700">Número de tarjeta</label>
                                        <div className="mt-1 relative">
                                            <input
                                                ref={cardInputRef}
                                                value={cardNumber}
                                                onChange={handleCardNumberChange}
                                                placeholder="0000 0000 0000 0000"
                                                inputMode="numeric"
                                                maxLength={30}
                                                className="block w-full border border-gray-300 rounded-md p-2 pr-10"
                                            />
                                            {/* small brand indicator */}
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                {cardBrand === 'visa' && (
                                                    <span className="text-xs font-semibold text-blue-600">Visa</span>
                                                )}
                                                {cardBrand === 'mastercard' && (
                                                    <span className="text-xs font-semibold text-orange-600">Mastercard</span>
                                                )}
                                                {cardBrand === 'amex' && (
                                                    <span className="text-xs font-semibold text-indigo-600">Amex</span>
                                                )}
                                            </div>
                                        </div>
                                        {errors.cardNumber && <p className="text-xs text-red-600 mt-1">{errors.cardNumber}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Titular de la tarjeta</label>
                                        <input value={cardName} onChange={(e) => setCardName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                                        {errors.cardName && <p className="text-xs text-red-600 mt-1">{errors.cardName}</p>}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Expiración (MM/AA)</label>
                                            <input
                                                ref={expiryInputRef}
                                                    value={expiry}
                                                    onChange={handleExpiryChange}
                                                    placeholder="MM/AA"
                                                    inputMode="numeric"
                                                    maxLength={5}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            />
                                            {errors.expiry && <p className="text-xs text-red-600 mt-1">{errors.expiry}</p>}
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">CVC</label>
                                            <input
                                                value={cvc}
                                                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0,4))}
                                                placeholder="123"
                                                inputMode="numeric"
                                                maxLength={3}
                                                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            />
                                            {errors.cvc && <p className="text-xs text-red-600 mt-1">{errors.cvc}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                                        <input
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="tu@correo.com"
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                        />
                                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                                    </div>

                                    <div className="flex items-center justify-between mt-6">
                                        <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border rounded-md">Cancelar</button>
                                        <button type="submit" className="px-6 py-2 bg-[var(--Primary_5)] text-white rounded-md">Pagar S/ {Number(totalPrice).toFixed(2)}</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-6 text-center p-6">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
                                        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-green-600"><path d="M20 6L9 17l-5-5"></path></svg>
                                    </div>
                                    <h4 className="text-lg font-semibold">Pago procesado</h4>
                                    <p className="text-sm text-gray-600 mt-2">Gracias por tu compra. Se ha procesado el pago correctamente.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}
            <Footer />
        </>
    );
}


