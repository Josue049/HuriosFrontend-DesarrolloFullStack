import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { useCart } from "../context/CartContext";
import { getToken } from "../utils/token";
import { useRoleProtection } from "../hooks/useRoleProtection";
import { createMercadoPagoCheckout } from "../api/payments";

export function Payment() {
    useRoleProtection("payment"); // Bloquear acceso a admins
    const navigate = useNavigate();
    const { items, totalPrice } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState("");

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

    const handleMercadoPagoCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setProcessingError("");

        try {
            const checkoutData = JSON.parse(sessionStorage.getItem("checkoutData") || "{}");

            const paymentPayload = {
                checkoutInfo: checkoutData,
                paymentMethod: "mercadopago",
                paymentDetails: {
                    gateway: "MercadoPago Checkout Pro",
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

            const pref = await createMercadoPagoCheckout(paymentPayload);

            // Guardar snapshot para generar la Boleta/Factura PDF al volver de MercadoPago
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
        } catch (error: any) {
            console.error("Error iniciando checkout con MercadoPago:", error);
            setProcessingError(
                error.message || "Error al conectar con la pasarela de MercadoPago. Intenta nuevamente."
            );
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[var(--Primary_0)]">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pasarela de Pago</h1>
                        <button
                            onClick={() => navigate("/checkout")}
                            className="text-[var(--Primary_5)] hover:underline text-sm cursor-pointer"
                        >
                            ← Volver a datos de envío
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        MercadoPago Checkout Pro
                                    </h2>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                                        Modo Sandbox / Pruebas
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-6">
                                    Serás redirigido de forma segura a la pasarela oficial de{" "}
                                    <strong>MercadoPago</strong> para completar tu compra. La transacción y los
                                    intentos de pago se registran automáticamente en nuestra base de datos documental{" "}
                                    <strong>MongoDB Atlas</strong> (<code>payment_transactions</code>), y el stock solo
                                    se descuenta cuando tu pago es aprobado.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 text-center">
                                        <p className="font-semibold text-gray-900 text-sm">Tarjetas de Prueba</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Visa, Mastercard, Amex (Crédito y Débito)
                                        </p>
                                    </div>
                                    <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 text-center">
                                        <p className="font-semibold text-gray-900 text-sm">Billeteras y Saldo</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Cuenta de prueba MercadoPago / Yape
                                        </p>
                                    </div>
                                    <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 text-center">
                                        <p className="font-semibold text-gray-900 text-sm">Comprobante PDF</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Boleta o Factura automática al aprobarse
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-xs text-gray-600 space-y-1">
                                    <p className="font-semibold text-gray-800">
                                        Datos de tarjeta de prueba de MercadoPago (Perú):
                                    </p>
                                    <p>• Titular: <code>APRO</code> (para pago aprobado) o <code>OTHE</code> (para pago rechazado)</p>
                                    <p>• Vencimiento: <code>11/29</code> | Código de seguridad (CVV): <code>123</code></p>
                                </div>

                                {processingError && (
                                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                                        <p className="text-sm text-red-700">{processingError}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resumen */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen de Orden</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal ({items.length} productos)</span>
                                        <span className="font-medium">S/ {totalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Envío</span>
                                        <span className={`font-medium ${shippingCost === 0 ? "text-green-600" : ""}`}>
                                            {shippingCost === 0 ? "Gratis" : `S/ ${shippingCost.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3">
                                        <div className="flex justify-between">
                                            <span className="text-lg font-semibold text-gray-900">Total</span>
                                            <span className="text-lg font-bold text-gray-900">
                                                S/ {finalTotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleMercadoPagoCheckout}
                                        disabled={isProcessing}
                                        className="w-full bg-[#009EE3] hover:bg-[#0082bd] text-white py-3.5 px-4 rounded-lg font-semibold transition-colors mt-4 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
                                                Redirigiendo a MercadoPago...
                                            </>
                                        ) : (
                                            `Pagar con MercadoPago (S/ ${finalTotal.toFixed(2)})`
                                        )}
                                    </button>

                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Procesado por MercadoPago • Registro en MongoDB Atlas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
