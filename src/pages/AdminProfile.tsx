import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { ButtonAdmin } from "../components/ui/ButtonAdmin";
import { getUserProfile, updateUserProfile, type UserProfile as UserProfileType } from "../api/user";
import { getToken } from "../utils/token";
import { useAdminSessionTimeout } from "../hooks/useAdminSessionTimeout";
import { ProfileAvatar } from "../components/user/ProfileAvatar";
import { downloadExportReport, type ExportType } from "../api/exports";
import { getAllSales, type PaymentSale } from "../api/payments";
import { getAllProducts, type Product } from "../api/products";
import { sendRealtimeBroadcast } from "../components/realtime/RealtimeNotifier";

export function AdminProfile() {
    const navigate = useNavigate();
    useAdminSessionTimeout();
    const [profile, setProfile] = useState<UserProfileType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [exportingType, setExportingType] = useState<ExportType | null>(null);
    const [fullName, setFullName] = useState("");

    // Datos del Dashboard en Tiempo Real
    const [sales, setSales] = useState<PaymentSale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [lastSaleHighlightId, setLastSaleHighlightId] = useState<number | null>(null);
    const [liveIncrementAmount, setLiveIncrementAmount] = useState<number | null>(null);

    // Formulario para emitir promoción/notificación en vivo a los clientes
    const [promoProductId, setPromoProductId] = useState<string>("");
    const [promoMessage, setPromoMessage] = useState<string>("");

    useEffect(() => {
        if (!getToken()) {
            navigate("/login");
            return;
        }
        loadAllDashboardData();

        const handleRealtimeUpdate = (e: Event) => {
            const custom = e as CustomEvent;
            const detail = custom.detail;
            if (detail?.type === "NEW_SALE") {
                const saleId = Number(detail?.data?.saleId);
                const total = Number(detail?.data?.total);
                if (!Number.isNaN(saleId)) setLastSaleHighlightId(saleId);
                if (!Number.isNaN(total) && total > 0) {
                    setLiveIncrementAmount(total);
                    setTimeout(() => setLiveIncrementAmount(null), 8000);
                }
            }
            refreshMetricsSilently();
        };

        window.addEventListener("hurios-realtime-event", handleRealtimeUpdate);
        return () => window.removeEventListener("hurios-realtime-event", handleRealtimeUpdate);
    }, [navigate]);

    const loadAllDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [profileData, salesData, productsData] = await Promise.all([
                getUserProfile(),
                getAllSales().catch(() => [] as PaymentSale[]),
                getAllProducts().catch(() => [] as Product[]),
            ]);
            setProfile(profileData);
            setFullName(profileData.fullName || "");
            setSales(salesData);
            setProducts(productsData);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Error al cargar el dashboard de administración");
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshMetricsSilently = async () => {
        try {
            const [salesData, productsData] = await Promise.all([
                getAllSales().catch(() => [] as PaymentSale[]),
                getAllProducts().catch(() => [] as Product[]),
            ]);
            setSales(salesData);
            setProducts(productsData);
        } catch {
            // Ignorar errores silenciosos de refresco
        }
    };

    // Cálculo de KPIs del Dashboard
    const dashboardStats = useMemo(() => {
        const confirmedSales = sales.filter((s) => s.status !== "RECHAZADO");
        const totalRevenue = confirmedSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const totalOrders = confirmedSales.length;
        const totalUnitsSold = confirmedSales.reduce((acc, s) => {
            const itemsCount = (s.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            return acc + (itemsCount > 0 ? itemsCount : 1);
        }, 0);
        const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
        const lowStockCount = products.filter((p) => (p.stock ?? 0) < 10).length;

        const recentSales = [...sales]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6);

        return {
            totalRevenue,
            totalOrders,
            totalUnitsSold,
            totalProducts: products.length,
            totalStockUnits,
            lowStockCount,
            recentSales,
        };
    }, [sales, products]);

    const handleSendPromotion = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedProduct = products.find((p) => String(p.id) === promoProductId);
        const defaultMsg = selectedProduct
            ? `🔥 ¡Promoción en ${selectedProduct.name} a solo S/ ${Number(selectedProduct.price).toFixed(2)}!`
            : "🔥 ¡Nuevas promociones disponibles en repuestos Hurios Rally!";

        const finalMsg = promoMessage.trim() || defaultMsg;
        const sent = sendRealtimeBroadcast({
            type: "PROMOTION",
            message: finalMsg,
            productId: selectedProduct ? selectedProduct.id : undefined,
            data: selectedProduct
                ? {
                      productId: selectedProduct.id,
                      productName: selectedProduct.name,
                      price: selectedProduct.price,
                  }
                : {},
        });

        if (sent) {
            setSuccessMessage("Notificación de promoción enviada en tiempo real a todos los clientes conectados.");
            setPromoMessage("");
            setTimeout(() => setSuccessMessage(null), 4000);
        } else {
            setError("El canal WebSocket aún se está conectando. Intenta en unos segundos.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);
            await updateUserProfile({ fullName });
            setSuccessMessage("Perfil actualizado correctamente");
            setEditing(false);
            await loadAllDashboardData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Error al actualizar el perfil");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setFullName(profile?.fullName || "");
        setError(null);
    };

    const handleExport = async (type: ExportType) => {
        try {
            setExportingType(type);
            setError(null);
            const fileName = await downloadExportReport(type);
            setSuccessMessage(`Reporte descargado correctamente: ${fileName}`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Error al exportar");
            }
        } finally {
            setExportingType(null);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-[var(--Primary_0)] flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--Primary_5)]"></div>
                        <p className="mt-4 text-gray-600">Cargando Dashboard de Administración...</p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[var(--Primary_0)] py-6 sm:py-8">
                <div className="max-w-6xl mx-auto px-4 space-y-6">
                    {/* Encabezado del Dashboard */}
                    <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100">
                        <div className="flex items-center gap-4">
                            <ProfileAvatar
                                imageUrl={profile?.profileImage}
                                onImageUpdate={async () => {
                                    await loadAllDashboardData();
                                }}
                                size="large"
                            />
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                        Dashboard General — {profile?.fullName || "Administrador"}
                                    </h1>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Tiempo Real Activo
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{profile?.email}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Las ventas y el stock se actualizan automáticamente en vivo cuando un cliente realiza una compra.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                                onClick={refreshMetricsSilently}
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-xs sm:text-sm font-medium cursor-pointer"
                            >
                                ↻ Actualizar
                            </button>
                            {!editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-3.5 py-2 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] transition-colors text-xs sm:text-sm font-medium cursor-pointer"
                                >
                                    Editar perfil
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mensajes de estado */}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                            <span>✓</span>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* 1. TARJETAS KPI EN TIEMPO REAL */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative overflow-hidden">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Ingresos Totales (Ventas)
                            </p>
                            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--Primary_5)]">
                                    S/ {dashboardStats.totalRevenue.toFixed(2)}
                                </span>
                                {liveIncrementAmount !== null && (
                                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full animate-bounce">
                                        + S/ {liveIncrementAmount.toFixed(2)} en vivo
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Total acumulado de órdenes confirmadas
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Órdenes Realizadas
                            </p>
                            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
                                {dashboardStats.totalOrders}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Compras registradas en el sistema
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Repuestos Vendidos
                            </p>
                            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">
                                {dashboardStats.totalUnitsSold} unid.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Unidades descontadas de inventario
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Stock en Catálogo ({dashboardStats.totalProducts} prod.)
                            </p>
                            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-indigo-600">
                                {dashboardStats.totalStockUnits} unid.
                            </p>
                            <p className="text-xs text-amber-600 font-medium mt-2">
                                {dashboardStats.lowStockCount > 0
                                    ? `⚠️ ${dashboardStats.lowStockCount} producto(s) con stock bajo (<10)`
                                    : "✓ Stock saludable en catálogo"}
                            </p>
                        </div>
                    </section>

                    {/* 2. ACCESOS RÁPIDOS DE GESTIÓN */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ButtonAdmin label="GESTIONAR INVENTARIO Y PRODUCTOS" route="/inventario" />
                        <ButtonAdmin label="HISTORIAL DE BOLETAS / FACTURAS" route="/boletas-facturas" />
                    </section>

                    {/* 3. PANEL ESPEJO EN TIEMPO REAL: ÚLTIMAS VENTAS + STOCK ACTUAL */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Últimas Ventas en Vivo */}
                        <div className="lg:col-span-7 bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Últimas Ventas en Tiempo Real
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Cuando un cliente compra, la orden aparece aquí automáticamente sin recargar
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                    En vivo
                                </span>
                            </div>

                            {dashboardStats.recentSales.length === 0 ? (
                                <p className="text-sm text-gray-500 py-8 text-center">
                                    Aún no hay ventas registradas.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-500">
                                                <th className="py-2.5 pr-2">Orden</th>
                                                <th className="py-2.5 px-2">Cliente</th>
                                                <th className="py-2.5 px-2">Método</th>
                                                <th className="py-2.5 px-2">Estado</th>
                                                <th className="py-2.5 pl-2 text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dashboardStats.recentSales.map((sale) => {
                                                const isJustCreated = sale.id === lastSaleHighlightId;
                                                return (
                                                    <tr
                                                        key={sale.id}
                                                        className={`transition-colors ${
                                                            isJustCreated
                                                                ? "bg-emerald-50 font-semibold"
                                                                : "hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        <td className="py-3 pr-2 font-mono text-gray-900">
                                                            #{sale.id}
                                                            {isJustCreated && (
                                                                <span className="ml-1.5 inline-block bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                                    NUEVA
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 text-gray-800 truncate max-w-[140px]">
                                                            {sale.fullName || sale.companyName || sale.user?.email || "Cliente"}
                                                        </td>
                                                        <td className="py-3 px-2 uppercase text-xs text-gray-600">
                                                            {sale.paymentMethod}
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                                    sale.status === "CONFIRMADO"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-amber-100 text-amber-700"
                                                                }`}
                                                            >
                                                                {sale.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pl-2 text-right font-bold text-[var(--Primary_5)]">
                                                            S/ {Number(sale.total).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Monitor de Stock en Vivo */}
                        <div className="lg:col-span-5 bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Monitor de Stock en Vivo
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Se descuenta al instante tras cada compra
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate("/inventario")}
                                    className="text-xs font-semibold text-[var(--Primary_5)] hover:underline cursor-pointer"
                                >
                                    Abastecer →
                                </button>
                            </div>

                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {products.slice(0, 10).map((prod) => {
                                    const stockVal = prod.stock ?? 0;
                                    return (
                                        <div
                                            key={prod.id}
                                            className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50/70 text-xs sm:text-sm"
                                        >
                                            <div className="min-w-0 flex-1 pr-3">
                                                <p className="font-medium text-gray-900 truncate">{prod.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    S/ {Number(prod.price).toFixed(2)}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                                                    stockVal === 0
                                                        ? "bg-red-100 text-red-700"
                                                        : stockVal < 10
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                }`}
                                            >
                                                {stockVal} unid.
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* 4. EMITIR PROMOCIÓN / NOTIFICACIÓN EN VIVO A CLIENTES */}
                    <section className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            📢 Emitir Promoción o Anuncio en Tiempo Real a Clientes
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Envía una notificación instantánea con enlace directo a todos los clientes que tengan la tienda abierta.
                        </p>
                        <form onSubmit={handleSendPromotion} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-4">
                                <select
                                    value={promoProductId}
                                    onChange={(e) => setPromoProductId(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                >
                                    <option value="">Seleccionar producto en promoción (opcional)</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={String(p.id)}>
                                            {p.name} — S/ {Number(p.price).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-5">
                                <input
                                    type="text"
                                    value={promoMessage}
                                    onChange={(e) => setPromoMessage(e.target.value)}
                                    placeholder="Ej: 🔥 ¡Oferta 20% Dscto en este repuesto por hoy!"
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer shadow-sm"
                                >
                                    Enviar Notificación en Vivo
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* 5. EXPORTAR REPORTES EXCEL */}
                    <section className="bg-white rounded-xl shadow-md p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Exportar Reportes Excel</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={() => handleExport("clients")}
                                disabled={exportingType !== null}
                                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm font-medium"
                            >
                                {exportingType === "clients" ? "Exportando..." : "Exportar Clientes (.xlsx)"}
                            </button>
                            <button
                                onClick={() => handleExport("sales")}
                                disabled={exportingType !== null}
                                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm font-medium"
                            >
                                {exportingType === "sales" ? "Exportando..." : "Exportar Ventas (.xlsx)"}
                            </button>
                            <button
                                onClick={() => handleExport("products")}
                                disabled={exportingType !== null}
                                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm font-medium"
                            >
                                {exportingType === "products" ? "Exportando..." : "Exportar Productos (.xlsx)"}
                            </button>
                        </div>
                    </section>

                    {/* 6. FORMULARIO DE EDICIÓN DE PERFIL (colapsable o visible al editar) */}
                    {editing && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Editar Perfil de Administrador</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Correo electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={profile?.email || ""}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Ingresa tu nombre completo"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--Primary_5)]"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] font-medium cursor-pointer"
                                    >
                                        {saving ? "Guardando..." : "Guardar cambios"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
