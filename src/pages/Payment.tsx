import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { useCart } from "../context/CartContext";
import { getToken, handleUnauthorizedResponse } from "../utils/token";
import { generateBoletaPDF, generateFacturaPDF } from "../utils/pdfGenerator";
import { useRoleProtection } from "../hooks/useRoleProtection";
import ButtonShowPsd from "../components/ui/ButtonShowPwd";
import { Input } from "../components/ui/Input";
import { API_BASE_URL } from "../config/api";
import { createMercadoPagoCheckout } from "../api/payments";

type PaymentMethod = "card" | "yape" | "mercadopago";

interface CardData {
    cardNumber: string;
    cardName: string;
    expiry: string;
    cvc: string;
}

interface YapeData {
    phone: string;
    approvalCode: string;
}

const API_BASE = API_BASE_URL;

export function Payment() {
    useRoleProtection("payment");
    const navigate = useNavigate();
    const { items, totalPrice, clearCart } = useCart();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState("");
    const [showThankYouModal, setShowThankYouModal] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [CVC, setVerCVC] = useState(false);

    const [cardData, setCardData] = useState<CardData>({
        cardNumber: "",
        cardName: "",
        expiry: "",
        cvc: "",
    });
    const [cardBrand, setCardBrand] = useState<string>("");
    const cardInputRef = useRef<HTMLInputElement | null>(null);
    const expiryInputRef = useRef<HTMLInputElement | null>(null);
    const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

    const [yapeData, setYapeData] = useState<YapeData>({
        phone: "",
        approvalCode: "",
    });
    const [yapeErrors, setYapeErrors] = useState<Record<string, string>>({});

    const checkoutInfo = React.useMemo(() => {
        try {
            return JSON.parse(sessionStorage.getItem("checkoutData") || "{}");
        } catch {
            return {};
        }
    }, []);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate("/login", { state: { from: "/payment" } });
            return;
        }

        const checkoutData = sessionStorage.getItem("checkoutData");
        if (!checkoutData || items.length === 0) {
            navigate("/cart");
        }
    }, [navigate, items]);

    const shippingCost = totalPrice >= 200 ? 0 : 10;
    const finalTotal = totalPrice + shippingCost;

    const sanitizeNumber = (s: string) => s.replace(/\s+/g, "");

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
        if (/^4/.test(digits)) return "visa";
        if (/^(34|37)/.test(digits)) return "amex";
        if (/^(5[1-5])/.test(digits)) return "mastercard";
        if (/^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return "mastercard";
        return "unknown";
    };

    const formatByBrand = (digits: string, brand: string) => {
        if (brand === "amex") {
            return digits
                .replace(/(\d{1,4})(\d{1,6})?(\d{1,5})?/, (_, g1, g2, g3) => {
                    return [g1, g2, g3].filter(Boolean).join(" ").trim();
                })
                .trim();
        }
        return digits.replace(/(.{4})/g, "$1 ").trim();
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const el = e.target;
        const rawValue = el.value;
        const prevPos = el.selectionStart || 0;
        const digits = rawValue.replace(/\D/g, "");
        const brand = detectCardBrand(digits);
        const formatted = formatByBrand(digits, brand);

        const digitsBeforeCursor = rawValue.slice(0, prevPos).replace(/\D/g, "").length;
        let newPos = 0;
        let counted = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) counted++;
            newPos++;
            if (counted >= digitsBeforeCursor) break;
        }

        setCardBrand(brand === "unknown" ? "" : brand);
        setCardData((prev) => ({ ...prev, cardNumber: formatted }));

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
        const digits = raw.replace(/\D/g, "");

        let formatted = "";
        if (digits.length <= 2) {
            formatted = digits;
        } else {
            const month = digits.slice(0, 2);
            const rest = digits.slice(2, 6);
            formatted = month + "/" + rest;
        }

        const digitsBeforeCursor = raw.slice(0, prevPos).replace(/\D/g, "").length;
        let newPos = 0;
        let counted = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) counted++;
            newPos++;
            if (counted >= digitsBeforeCursor) break;
        }

        setCardData((prev) => ({ ...prev, expiry: formatted }));
        requestAnimationFrame(() => {
            const input = expiryInputRef.current;
            if (input) input.setSelectionRange(newPos, newPos);
        });
    };

    const validateCardPayment = (): boolean => {
        const errors: Record<string, string> = {};
        const numSan = sanitizeNumber(cardData.cardNumber);

        if (!numSan) {
            errors.cardNumber = "Número de tarjeta requerido";
        } else if (!/^\d+$/.test(numSan)) {
            errors.cardNumber = "El número de tarjeta solo debe contener dígitos";
        } else if (numSan.length !== 16) {
            errors.cardNumber = "El número de tarjeta debe tener 16 dígitos";
        } else if (!luhnCheck(numSan)) {
            errors.cardNumber = "Número de tarjeta inválido";
        }

        if (!cardData.cardName.trim()) errors.cardName = "Nombre del titular requerido";

        const expMatch = cardData.expiry.match(/^(0[1-9]|1[0-2])\/(?:(\d{2})|(\d{4}))$/);
        if (!expMatch) {
            errors.expiry = "Fecha inválida (MM/AA)";
        } else {
            const month = parseInt(expMatch[1], 10);
            const yearRaw = expMatch[2] || expMatch[3];
            let year = parseInt(yearRaw, 10);
            if (yearRaw.length === 2) {
                const prefix = Math.floor(new Date().getFullYear() / 100) * 100;
                year += prefix;
                if (year < new Date().getFullYear()) year += 100;
            }
            const expDate = new Date(year, month, 0, 23, 59, 59);
            if (expDate < new Date()) errors.expiry = "Tarjeta expirada";
        }

        if (!/^[0-9]{3,4}$/.test(cardData.cvc)) errors.cvc = "CVC inválido";

        setCardErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateYapePayment = (): boolean => {
        const errors: Record<string, string> = {};

        if (!yapeData.phone.trim()) {
            errors.phone = "Número de celular requerido";
        } else if (!/^\d{9}$/.test(yapeData.phone)) {
            errors.phone = "El número debe tener 9 dígitos";
        }

        if (!yapeData.approvalCode.trim()) {
            errors.approvalCode = "Código de aprobación requerido";
        } else if (!/^\d+$/.test(yapeData.approvalCode)) {
            errors.approvalCode = "El código solo debe contener números";
        } else if (yapeData.approvalCode.length !== 6) {
            errors.approvalCode = "El código debe tener exactamente 6 dígitos";
        }

        setYapeErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessingError("");

        const checkoutData = JSON.parse(sessionStorage.getItem("checkoutData") || "{}");

        // Opción 3: Redirección externa a MercadoPago Checkout Pro
        if (paymentMethod === "mercadopago") {
            setIsProcessing(true);
            try {
                const paymentPayload = {
                    checkoutInfo: checkoutData,
                    paymentMethod: "mercadopago",
                    paymentDetails: { gateway: "MercadoPago Checkout Pro" },
                    items: items.map((item) => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                    totalPrice,
                    shippingCost,
                    finalTotal,
                };

                const pref = await createMercadoPagoCheckout(paymentPayload);
                sessionStorage.setItem(
                    "lastCheckoutSnapshot",
                    JSON.stringify({
                        saleId: pref.saleId,
                        preferenceId: pref.preferenceId,
                        transactionId: pref.transactionId,
                        checkoutData,
                        items,
                        totalPrice,
                        shippingCost,
                        finalTotal,
                    })
                );

                const redirectUrl = pref.sandboxInitPoint || pref.initPoint;
                if (!redirectUrl) {
                    throw new Error("No se recibió la URL de pago de MercadoPago");
                }
                window.location.href = redirectUrl;
                return;
            } catch (error: any) {
                setProcessingError(error.message || "Error al conectar con MercadoPago.");
                setIsProcessing(false);
                return;
            }
        }

        // Opción 1 y 2: Pago integrado con Tarjeta o Yape (guarda en PostgreSQL + MongoDB payment_transactions)
        const isValid = paymentMethod === "card" ? validateCardPayment() : validateYapePayment();
        if (!isValid) return;

        setIsProcessing(true);

        try {
            const token = getToken();
            if (!token) {
                throw new Error("No hay sesión activa");
            }

            const paymentData = {
                checkoutInfo: checkoutData,
                paymentMethod,
                paymentDetails:
                    paymentMethod === "card"
                        ? {
                              cardNumber: sanitizeNumber(cardData.cardNumber).slice(-4),
                              cardName: cardData.cardName,
                              brand: cardBrand || "visa",
                          }
                        : {
                              phone: yapeData.phone,
                              approvalCode: yapeData.approvalCode,
                          },
                items: items.map((item) => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price,
                })),
                totalPrice,
                shippingCost,
                finalTotal,
            };

            const res = await fetch(`${API_BASE}/payments/process`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(paymentData),
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorizedResponse();
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || "Error al procesar el pago");
            }

            const result = await res.json();

            const documentType = checkoutData.documentType;
            const currentDate = new Date().toLocaleDateString("es-PE");
            const paymentMethodLabel = paymentMethod === "card" ? "Tarjeta" : "Yape";
            const deliveryMethodLabel =
                checkoutData.deliveryMethod === "pickup" ? "Recojo en tienda" : "Entrega a domicilio";

            const pdfItems = items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.price * item.quantity,
            }));

            const baseImponible = finalTotal / 1.18;
            const igvCalculado = finalTotal - baseImponible;

            if (documentType === "dni") {
                await generateBoletaPDF({
                    boletaNumber: `B001-${result.orderId || "00001"}`,
                    date: currentDate,
                    clientName: checkoutData.fullName,
                    clientDNI: checkoutData.dni,
                    items: pdfItems,
                    subtotal: totalPrice,
                    igv: igvCalculado,
                    total: finalTotal,
                    paymentMethod: paymentMethodLabel,
                    deliveryMethod: deliveryMethodLabel,
                });
            } else {
                await generateFacturaPDF({
                    facturaNumber: `F001-${result.orderId || "00001"}`,
                    date: currentDate,
                    clientName: checkoutData.companyName,
                    clientRUC: checkoutData.ruc,
                    clientAddress: checkoutData.companyAddress,
                    items: pdfItems,
                    subtotal: totalPrice,
                    anticipos: 0,
                    descuentos: 0,
                    valorVenta: baseImponible,
                    isc: 0,
                    igv: igvCalculado,
                    total: finalTotal,
                    paymentMethod: paymentMethodLabel,
                    deliveryMethod: deliveryMethodLabel,
                });
            }

            setOrderId(result.orderId);
            setIsProcessing(false);
            setTimeout(() => {
                setShowThankYouModal(true);
            }, 200);
        } catch (error: any) {
            console.error("Error processing payment:", error);
            setProcessingError(error.message || "Error al procesar el pago. Por favor intenta nuevamente.");
            setIsProcessing(false);
        }
    };

    const resolveImg = (url?: string) => {
        if (!url) return "/assets/imgs/placeholder.svg";
        if (url.startsWith("http") || url.startsWith("/assets") || url.startsWith("blob:")) return url;
        return `${API_BASE}${url}`;
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[var(--Primary_0)] py-8">
                <div className="max-w-6xl mx-auto px-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra y Pago</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Elige tu método de pago preferido. Tu comprobante PDF se descargará automáticamente.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/checkout")}
                            className="text-[var(--Primary_5)] hover:underline text-sm font-medium cursor-pointer self-start"
                        >
                            ← Volver a datos de envío
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Columna Izquierda: Selector y Formulario de Pago */}
                        <div className="lg:col-span-7">
                            <form onSubmit={handleSubmitPayment}>
                                {/* Selector de Método de Pago */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        1. Selecciona tu Método de Pago
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Tarjeta */}
                                        <div
                                            onClick={() => setPaymentMethod("card")}
                                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                                                paymentMethod === "card"
                                                    ? "border-[var(--Primary_5)] bg-blue-50/70 shadow-xs"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <svg
                                                    width={28}
                                                    height={28}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={1.8}
                                                    className="text-[var(--Primary_5)]"
                                                >
                                                    <rect x={2} y={5} width={20} height={14} rx={2}></rect>
                                                    <line x1={2} y1={10} x2={22} y2={10}></line>
                                                </svg>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="card"
                                                    checked={paymentMethod === "card"}
                                                    onChange={() => setPaymentMethod("card")}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Tarjeta</p>
                                                <p className="text-xs text-gray-500">Visa, Mastercard, Amex</p>
                                            </div>
                                        </div>

                                        {/* Yape */}
                                        <div
                                            onClick={() => setPaymentMethod("yape")}
                                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                                                paymentMethod === "yape"
                                                    ? "border-purple-600 bg-purple-50/70 shadow-xs"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                    Y
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="yape"
                                                    checked={paymentMethod === "yape"}
                                                    onChange={() => setPaymentMethod("yape")}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Yape</p>
                                                <p className="text-xs text-gray-500">Código de aprobación</p>
                                            </div>
                                        </div>

                                        {/* MercadoPago */}
                                        <div
                                            onClick={() => setPaymentMethod("mercadopago")}
                                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                                                paymentMethod === "mercadopago"
                                                    ? "border-[#009EE3] bg-sky-50/70 shadow-xs"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-7 h-7 bg-[#009EE3] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                                    MP
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="mercadopago"
                                                    checked={paymentMethod === "mercadopago"}
                                                    onChange={() => setPaymentMethod("mercadopago")}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">MercadoPago</p>
                                                <p className="text-xs text-gray-500">Checkout Pro (Web)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Formulario de Tarjeta con Vista Previa Interactiva */}
                                {paymentMethod === "card" && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                            2. Datos de tu Tarjeta de Crédito o Débito
                                        </h2>

                                        {/* Vista previa visual de la tarjeta */}
                                        <div
                                            className={`rounded-2xl p-6 text-white shadow-lg mb-6 transition-all ${
                                                cardBrand === "mastercard"
                                                    ? "bg-gradient-to-r from-slate-900 via-orange-900 to-amber-700"
                                                    : cardBrand === "amex"
                                                    ? "bg-gradient-to-r from-indigo-900 via-blue-800 to-cyan-700"
                                                    : "bg-gradient-to-r from-[#0f2942] via-[#1b4368] to-[#2563eb]"
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="w-11 h-8 bg-yellow-400/80 rounded-md border border-yellow-200/60"></div>
                                                <span className="text-sm font-bold tracking-widest uppercase">
                                                    {cardBrand || "TARJETA HURIOS"}
                                                </span>
                                            </div>
                                            <div className="font-mono text-xl sm:text-2xl tracking-widest mb-5">
                                                {cardData.cardNumber || "•••• •••• •••• ••••"}
                                            </div>
                                            <div className="flex justify-between items-end text-xs uppercase tracking-wider opacity-90">
                                                <div>
                                                    <p className="text-[10px] opacity-70">Titular</p>
                                                    <p className="font-semibold text-sm truncate max-w-[200px]">
                                                        {cardData.cardName || "NOMBRE DEL TITULAR"}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] opacity-70">Vence</p>
                                                    <p className="font-semibold text-sm">{cardData.expiry || "MM/AA"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Número de tarjeta *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        ref={cardInputRef}
                                                        value={cardData.cardNumber}
                                                        onChange={handleCardNumberChange}
                                                        placeholder="4532 0151 1283 0366"
                                                        inputMode="numeric"
                                                        maxLength={19}
                                                        className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 pr-24 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                        {cardBrand === "visa" && (
                                                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                                VISA
                                                            </span>
                                                        )}
                                                        {cardBrand === "mastercard" && (
                                                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                                                MASTERCARD
                                                            </span>
                                                        )}
                                                        {cardBrand === "amex" && (
                                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                AMEX
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {cardErrors.cardNumber && (
                                                    <p className="text-xs text-red-600 mt-1">{cardErrors.cardNumber}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Titular de la tarjeta *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={cardData.cardName}
                                                    onChange={(e) =>
                                                        setCardData((prev) => ({
                                                            ...prev,
                                                            cardName: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="Ej. Edu Morales"
                                                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                />
                                                {cardErrors.cardName && (
                                                    <p className="text-xs text-red-600 mt-1">{cardErrors.cardName}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Fecha de expiración *
                                                    </label>
                                                    <input
                                                        ref={expiryInputRef}
                                                        value={cardData.expiry}
                                                        onChange={handleExpiryChange}
                                                        placeholder="MM/AA"
                                                        inputMode="numeric"
                                                        maxLength={5}
                                                        className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                    />
                                                    {cardErrors.expiry && (
                                                        <p className="text-xs text-red-600 mt-1">{cardErrors.expiry}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Input
                                                        type={CVC ? "text" : "password"}
                                                        value={cardData.cvc}
                                                        onChange={(e) =>
                                                            setCardData((prev) => ({
                                                                ...prev,
                                                                cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                                                            }))
                                                        }
                                                        label="Código CVC *"
                                                        placeholder="123"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        rightIcon={
                                                            <ButtonShowPsd
                                                                onClick={() => setVerCVC((prev) => !prev)}
                                                                aria-label={CVC ? "Ocultar CVC" : "Ver CVC"}
                                                                className="bg-transparent border-0 cursor-pointer text-inherit p-0 flex items-center"
                                                            >
                                                                <span className="material-symbols-outlined" translate="no">
                                                                    {CVC ? "visibility" : "visibility_off"}
                                                                </span>
                                                            </ButtonShowPsd>
                                                        }
                                                    />
                                                    {cardErrors.cvc && (
                                                        <p className="text-xs text-red-600 mt-1">{cardErrors.cvc}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Formulario de Yape */}
                                {paymentMethod === "yape" && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                                Y
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">
                                                    2. Pagar con Yape
                                                </h2>
                                                <p className="text-xs text-gray-500">
                                                    Ingresa tu número afiliado a Yape y el código de aprobación de 6 dígitos
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Número de Celular Yape *
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={yapeData.phone}
                                                    onChange={(e) =>
                                                        setYapeData((prev) => ({
                                                            ...prev,
                                                            phone: e.target.value.replace(/\D/g, "").slice(0, 9),
                                                        }))
                                                    }
                                                    placeholder="987654321"
                                                    inputMode="numeric"
                                                    maxLength={9}
                                                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                                />
                                                {yapeErrors.phone && (
                                                    <p className="text-xs text-red-600 mt-1">{yapeErrors.phone}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Código de Aprobación (6 dígitos) *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={yapeData.approvalCode}
                                                    onChange={(e) =>
                                                        setYapeData((prev) => ({
                                                            ...prev,
                                                            approvalCode: e.target.value.replace(/\D/g, "").slice(0, 6),
                                                        }))
                                                    }
                                                    placeholder="123456"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-600"
                                                />
                                                {yapeErrors.approvalCode && (
                                                    <p className="text-xs text-red-600 mt-1">{yapeErrors.approvalCode}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1.5">
                                                    Encuéntralo en el menú principal de tu app Yape en la opción &ldquo;Código de aprobación&rdquo;.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Opción MercadoPago Checkout Pro */}
                                {paymentMethod === "mercadopago" && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#009EE3] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                                    MP
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-semibold text-gray-900">
                                                        2. Pasarela Externa MercadoPago
                                                    </h2>
                                                    <p className="text-xs text-gray-500">
                                                        Checkout Pro oficial con redirección web
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1 rounded-full">
                                                Sandbox Activo
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Al continuar, se generará una preferencia de pago con el SDK oficial de{" "}
                                            <strong>MercadoPago</strong> y se abrirá su pasarela web. Importante: si estás en el
                                            mismo navegador donde abriste tu cuenta de vendedor de MercadoPago, usa una ventana
                                            de incógnito o la pestaña de <strong>Tarjeta / Yape</strong> de arriba para pagar directo.
                                        </p>
                                    </div>
                                )}

                                {processingError && (
                                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-sm text-red-700">{processingError}</p>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Columna Derecha: Detalle de Productos, Envío y Resumen */}
                        <div className="lg:col-span-5">
                            <div className="sticky top-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
                                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
                                    Resumen de tu Pedido ({items.length})
                                </h2>

                                {/* Lista de productos con imagen */}
                                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <img
                                                src={resolveImg(item.imageUrl)}
                                                alt={item.name}
                                                className="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/assets/imgs/placeholder.svg";
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    Cant: {item.quantity} × S/ {Number(item.price).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                S/ {(Number(item.price) * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Datos de Envío y Comprobante */}
                                {checkoutInfo?.fullName && (
                                    <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200 text-xs text-gray-600 space-y-1">
                                        <p className="font-semibold text-gray-800">Datos del Comprobante y Entrega:</p>
                                        <p>
                                            • Cliente: <span className="font-medium text-gray-800">{checkoutInfo.fullName}</span>
                                        </p>
                                        <p>
                                            • Comprobante:{" "}
                                            <span className="font-medium text-gray-800 uppercase">
                                                {checkoutInfo.documentType === "ruc"
                                                    ? `Factura (RUC: ${checkoutInfo.ruc})`
                                                    : `Boleta (DNI: ${checkoutInfo.dni})`}
                                            </span>
                                        </p>
                                        <p>
                                            • Entrega:{" "}
                                            <span className="font-medium text-gray-800">
                                                {checkoutInfo.deliveryMethod === "pickup"
                                                    ? "Recojo en tienda"
                                                    : `${checkoutInfo.deliveryAddress || ""} - ${checkoutInfo.deliveryDistrict || ""}`}
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {/* Totales */}
                                <div className="space-y-2.5 border-t border-gray-200 pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium">S/ {totalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Costo de Envío</span>
                                        <span className={`font-medium ${shippingCost === 0 ? "text-green-600" : ""}`}>
                                            {shippingCost === 0 ? "Gratis" : `S/ ${shippingCost.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                                        <span className="text-base font-bold text-gray-900">Total a Pagar</span>
                                        <span className="text-2xl font-bold text-[var(--Primary_5)]">
                                            S/ {finalTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmitPayment}
                                    disabled={isProcessing}
                                    className={`w-full text-white py-3.5 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md ${
                                        paymentMethod === "yape"
                                            ? "bg-purple-600 hover:bg-purple-700"
                                            : paymentMethod === "mercadopago"
                                            ? "bg-[#009EE3] hover:bg-[#0082bd]"
                                            : "bg-[var(--Primary_5)] hover:bg-[#1e4a6f]"
                                    }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx={12}
                                                    cy={12}
                                                    r={10}
                                                    strokeWidth={4}
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Procesando pago...
                                        </>
                                    ) : paymentMethod === "mercadopago" ? (
                                        `Ir a MercadoPago (S/ ${finalTotal.toFixed(2)})`
                                    ) : paymentMethod === "yape" ? (
                                        `Pagar con Yape (S/ ${finalTotal.toFixed(2)})`
                                    ) : (
                                        `Pagar con Tarjeta (S/ ${finalTotal.toFixed(2)})`
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    🔒 Transacción encriptada • Registro automático en PostgreSQL y MongoDB Atlas
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Confirmación de Compra */}
            {showThankYouModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-8 shadow-2xl transform animate-scaleIn">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-10 h-10 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={3}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-3xl font-bold text-gray-900 text-center mb-3">
                            ¡Gracias por tu compra!
                        </h3>

                        <div className="text-center mb-6">
                            <p className="text-gray-600 text-lg mb-2">
                                Tu pedido ha sido procesado exitosamente.
                            </p>
                            <p className="text-sm text-gray-500">
                                Tu comprobante PDF fue descargado y la transacción quedó registrada en MongoDB Atlas.
                            </p>
                            {orderId && (
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-600 font-medium">Número de orden</p>
                                    <p className="text-lg font-bold text-blue-700">#{orderId}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                clearCart();
                                sessionStorage.removeItem("checkoutData");
                                setShowThankYouModal(false);
                                navigate("/", { state: { orderSuccess: true, orderId } });
                            }}
                            className="w-full bg-gradient-to-r from-[var(--Primary_5)] to-[#1e4a6f] text-white py-4 px-6 rounded-xl cursor-pointer font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}
