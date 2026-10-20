import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../context/CartContext";
import { verifyMercadoPagoPayment, type PaymentVerificationResponse } from "../api/payments";
import { generateBoletaPDF, generateFacturaPDF } from "../utils/pdfGenerator";

export const PaymentResult: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { clearCart } = useCart();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [verification, setVerification] = useState<PaymentVerificationResponse | null>(null);
    const hasVerifiedRef = useRef(false);

    const isSuccessRoute = location.pathname.includes("/pago/exito");
    const isPendingRoute = location.pathname.includes("/pago/pendiente");

    useEffect(() => {
        if (hasVerifiedRef.current) return;
        hasVerifiedRef.current = true;

        const runVerification = async () => {
            try {
                const params = new URLSearchParams(searchParams);
                if (!params.get("status") && !params.get("collection_status")) {
                    params.set("status", isSuccessRoute ? "approved" : isPendingRoute ? "pending" : "rejected");
                }

                const snapshotRaw = sessionStorage.getItem("lastCheckoutSnapshot");
                const snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;
                if (!params.get("external_reference") && snapshot?.saleId) {
                    params.set("external_reference", String(snapshot.saleId));
                }

                const result = await verifyMercadoPagoPayment(params.toString());
                setVerification(result);

                if (result.approved || result.status === "CONFIRMADO") {
                    clearCart();
                    sessionStorage.removeItem("checkoutData");

                    if (snapshot && Array.isArray(snapshot.items) && snapshot.checkoutData) {
                        const checkoutData = snapshot.checkoutData;
                        const currentDate = new Date().toLocaleDateString("es-PE");
                        const deliveryMethodLabel =
                            checkoutData.deliveryMethod === "pickup" ? "Recojo en tienda" : "Entrega a domicilio";
                        const finalTotal = Number(snapshot.finalTotal || result.total || 0);
                        const totalPrice = Number(snapshot.totalPrice || finalTotal);
                        const baseImponible = finalTotal / 1.18;
                        const igvCalculado = finalTotal - baseImponible;

                        const pdfItems = snapshot.items.map((item: any) => ({
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            total: item.price * item.quantity,
                        }));

                        if (checkoutData.documentType === "dni") {
                            await generateBoletaPDF({
                                boletaNumber: `B001-${result.saleId || "00001"}`,
                                date: currentDate,
                                clientName: checkoutData.fullName,
                                clientDNI: checkoutData.dni,
                                items: pdfItems,
                                subtotal: totalPrice,
                                igv: igvCalculado,
                                total: finalTotal,
                                paymentMethod: "MercadoPago",
                                deliveryMethod: deliveryMethodLabel,
                            });
                        } else {
                            await generateFacturaPDF({
                                facturaNumber: `F001-${result.saleId || "00001"}`,
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
                                paymentMethod: "MercadoPago",
                                deliveryMethod: deliveryMethodLabel,
                            });
                        }
                        sessionStorage.removeItem("lastCheckoutSnapshot");
                    }
                }
            } catch (err: any) {
                setError(err.message || "No se pudo verificar el estado del pago.");
            } finally {
                setLoading(false);
            }
        };

        runVerification();
    }, [searchParams, isSuccessRoute, isPendingRoute, clearCart]);

    const approved = verification?.approved || verification?.status === "CONFIRMADO";
    const rejected = verification?.status === "RECHAZADO" || (!isSuccessRoute && !isPendingRoute && !approved);

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[var(--Primary_0)] flex items-center justify-center px-4 py-12">
                <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-xl border border-gray-100 text-center">
                    {loading ? (
                        <div className="py-8">
                            <div className="w-16 h-16 border-4 border-[var(--Primary_5)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Verificando tu pago con MercadoPago...
                            </h2>
                            <p className="text-gray-600 text-sm">
                                Estamos confirmando la transacción y registrando el comprobante en MongoDB.
                            </p>
                        </div>
                    ) : error ? (
                        <div>
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                                !
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Aviso de verificación</h2>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate("/my-orders")}
                                    className="flex-1 bg-[var(--Primary_5)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1e4a6f] cursor-pointer"
                                >
                                    Ver mis pedidos
                                </button>
                                <button
                                    onClick={() => navigate("/")}
                                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 cursor-pointer"
                                >
                                    Ir al inicio
                                </button>
                            </div>
                        </div>
                    ) : approved ? (
                        <div>
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Pago Aprobado!</h2>
                            <p className="text-gray-600 mb-4">{verification?.message}</p>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Orden de Compra:</span>
                                    <span className="font-bold text-blue-800">#{verification?.saleId}</span>
                                </div>
                                {verification?.mpPaymentId && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ID Pago MercadoPago:</span>
                                        <span className="font-mono font-medium text-gray-800">{verification.mpPaymentId}</span>
                                    </div>
                                )}
                                {verification?.transactionId && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ID Transacción MongoDB:</span>
                                        <span className="font-mono text-xs text-gray-700">{verification.transactionId}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-blue-200 pt-2">
                                    <span className="text-gray-700 font-semibold">Total Pagado:</span>
                                    <span className="font-bold text-gray-900">S/ {Number(verification?.total || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate("/my-orders")}
                                    className="flex-1 bg-[var(--Primary_5)] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#1e4a6f] cursor-pointer"
                                >
                                    Ver mis pedidos
                                </button>
                                <button
                                    onClick={() => navigate("/")}
                                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 cursor-pointer"
                                >
                                    Seguir comprando
                                </button>
                            </div>
                        </div>
                    ) : rejected ? (
                        <div>
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pago no completado</h2>
                            <p className="text-gray-600 mb-6">
                                {verification?.message || "El pago fue rechazado o cancelado en MercadoPago. No se realizó ningún cargo ni descuento de stock."}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate("/payment")}
                                    className="flex-1 bg-[var(--Primary_5)] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#1e4a6f] cursor-pointer"
                                >
                                    Intentar nuevamente
                                </button>
                                <button
                                    onClick={() => navigate("/cart")}
                                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 cursor-pointer"
                                >
                                    Volver al carrito
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-bold">
                                ⏳
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pago en proceso</h2>
                            <p className="text-gray-600 mb-6">
                                {verification?.message || "Tu pago está pendiente de confirmación por parte de MercadoPago."}
                            </p>
                            <button
                                onClick={() => navigate("/my-orders")}
                                className="w-full bg-[var(--Primary_5)] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#1e4a6f] cursor-pointer"
                            >
                                Ver estado en Mis Pedidos
                            </button>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
};

export default PaymentResult;
