// src/pages/AdminProfile.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getUserProfile, updateUserProfile, uploadProfileImage } from "../api/user";
import { getAllSales, type PaymentSale } from "../api/payments";
import { getAllProducts } from "../api/products";
import { type Product } from "../components/product/ShopCard";
import { getToken, clearToken } from "../utils/token";
import { useAdminSessionTimeout } from "../hooks/useAdminSessionTimeout";
import {
  sendRealtimeBroadcast,
  type RealtimeEventPayload,
} from "../components/realtime/RealtimeNotifier";

type PeriodFilter = "all" | "today" | "7d" | "30d";
type PaymentFilter = "all" | "card" | "yape" | "mercadopago";
type StockFilter = "all" | "critical" | "normal" | "out";

function normalizePaymentMethod(method?: string): "card" | "yape" | "mercadopago" {
  const m = (method || "").toLowerCase();
  if (m.includes("yape")) return "yape";
  if (m.includes("mercado")) return "mercadopago";
  return "card";
}

function formatPaymentLabel(key: "card" | "yape" | "mercadopago"): string {
  if (key === "yape") return "Yape";
  if (key === "mercadopago") return "MercadoPago";
  return "Tarjeta";
}

export function AdminProfile() {
  useAdminSessionTimeout();
  const navigate = useNavigate();

  // Estado del perfil
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Datos para Inteligencia de Negocios (BI)
  const [sales, setSales] = useState<PaymentSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [liveSessionDelta, setLiveSessionDelta] = useState<number>(0);
  const [liveNewOrdersCount, setLiveNewOrdersCount] = useState<number>(0);
  const [recentRealtimeIds, setRecentRealtimeIds] = useState<number[]>([]);

  // Segmentadores interactivos estilo Power BI
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // Difusión de promociones en tiempo real
  const [promoMessage, setPromoMessage] = useState("");
  const [promoProductId, setPromoProductId] = useState<string>("");
  const [promoStatus, setPromoStatus] = useState<string | null>(null);

  // Estados de edición de perfil
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoadingDashboard(true);
    }
    try {
      const [salesData, productsData] = await Promise.all([
        getAllSales().catch(() => [] as PaymentSale[]),
        getAllProducts().catch(() => [] as Product[]),
      ]);
      setSales(salesData);
      setProducts(productsData);
    } finally {
      if (!isSilent) {
        setLoadingDashboard(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    const loadUserData = async () => {
      try {
        setLoading(true);
        const data = await getUserProfile();
        if (data.role !== "ADMINISTRADOR") {
          navigate("/user-profile", { replace: true });
          return;
        }
        setNombre(data.fullName || "");
        setCorreo(data.email || "");
        setTelefono(data.phone || "");
        setDireccion(data.address || "");
        setProfileImageUrl(data.profileImage || null);
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos del perfil");
        if (err.message?.includes("No autorizado")) {
          clearToken();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
    loadDashboardData(false);
  }, [navigate, loadDashboardData]);

  // Escuchar eventos WebSocket en tiempo real para actualizar KPIs, gráficas y stock al instante
  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const customEvt = event as CustomEvent<RealtimeEventPayload>;
      const detail = customEvt.detail;
      if (!detail) return;

      if (detail.type === "NEW_SALE") {
        const saleTotal = Number(detail.data?.total || 0);
        const orderId = Number(detail.data?.orderId || 0);
        if (saleTotal > 0) {
          setLiveSessionDelta((prev) => prev + saleTotal);
        }
        setLiveNewOrdersCount((prev) => prev + 1);
        if (orderId) {
          setRecentRealtimeIds((prev) => [orderId, ...prev].slice(0, 10));
        }
        loadDashboardData(true);
      } else if (
        detail.type === "STOCK_UPDATED" ||
        detail.type === "PRODUCT_CREATED" ||
        detail.type === "PRODUCT_UPDATED"
      ) {
        const pid = Number(detail.data?.productId);
        const newStock = detail.data?.newStock;
        if (pid && typeof newStock === "number") {
          setProducts((prev) =>
            prev.map((p) => (p.id === pid ? { ...p, stock: newStock } : p))
          );
        }
        loadDashboardData(true);
      }
    };

    window.addEventListener("hurios-realtime-event", handleRealtime);
    return () => {
      window.removeEventListener("hurios-realtime-event", handleRealtime);
    };
  }, [loadDashboardData]);

  // Mapa de productos por ID para cruzar ventas con categorías
  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Categorías únicas disponibles
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  // Filtrado de ventas según segmentadores (Periodo, Categoría, Método de Pago)
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const ms7d = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const ms30d = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return sales.filter((sale) => {
      if (periodFilter !== "all" && sale.createdAt) {
        const createdTime = new Date(sale.createdAt).getTime();
        if (periodFilter === "today" && createdTime < startOfToday) return false;
        if (periodFilter === "7d" && createdTime < ms7d) return false;
        if (periodFilter === "30d" && createdTime < ms30d) return false;
      }

      if (paymentFilter !== "all") {
        if (normalizePaymentMethod(sale.paymentMethod) !== paymentFilter) return false;
      }

      if (categoryFilter !== "all") {
        const hasCategoryItem = (sale.items || []).some((it) => {
          const pid = it.product?.id;
          const prod = pid ? productById.get(pid) : undefined;
          return (prod?.category || "").toLowerCase() === categoryFilter.toLowerCase();
        });
        if (!hasCategoryItem) return false;
      }

      return true;
    });
  }, [sales, periodFilter, paymentFilter, categoryFilter, productById]);

  // Filtrado de inventario según segmentadores (Categoría y Estado de Stock)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all") {
        if ((p.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }
      const stock = p.stock ?? 0;
      if (stockFilter === "critical" && (stock <= 0 || stock > 5)) return false;
      if (stockFilter === "normal" && stock <= 5) return false;
      if (stockFilter === "out" && stock > 0) return false;
      return true;
    });
  }, [products, categoryFilter, stockFilter]);

  // KPIs calculados sobre el segmento activo
  const totalRevenue = useMemo(
    () => filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
    [filteredSales]
  );

  const totalOrders = filteredSales.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const totalUnitsSold = useMemo(
    () =>
      filteredSales.reduce(
        (acc, s) =>
          acc +
          (s.items || []).reduce((sum, it) => {
            if (categoryFilter !== "all") {
              const pid = it.product?.id;
              const prod = pid ? productById.get(pid) : undefined;
              if ((prod?.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
                return sum;
              }
            }
            return sum + (Number(it.quantity) || 0);
          }, 0),
        0
      ),
    [filteredSales, categoryFilter, productById]
  );

  const inventoryValuation = useMemo(
    () =>
      filteredProducts.reduce(
        (acc, p) => acc + (Number(p.price) || 0) * Math.max(0, Number(p.stock) || 0),
        0
      ),
    [filteredProducts]
  );

  const totalStockUnits = useMemo(
    () => filteredProducts.reduce((acc, p) => acc + Math.max(0, Number(p.stock) || 0), 0),
    [filteredProducts]
  );

  const criticalStockCount = useMemo(
    () => filteredProducts.filter((p) => (p.stock ?? 0) <= 5).length,
    [filteredProducts]
  );

  // Gráfica 1: Evolución de Ingresos por Fecha (últimas 7 fechas con actividad)
  const revenueByDateSeries = useMemo(() => {
    const map = new Map<string, { label: string; revenue: number; orders: number }>();

    const sortedChronological = [...filteredSales].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tA - tB;
    });

    for (const sale of sortedChronological) {
      const dateObj = sale.createdAt ? new Date(sale.createdAt) : new Date();
      const isoDay = dateObj.toISOString().slice(0, 10);
      const label = dateObj.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
      });
      const prev = map.get(isoDay) || { label, revenue: 0, orders: 0 };
      prev.revenue += Number(sale.total) || 0;
      prev.orders += 1;
      map.set(isoDay, prev);
    }

    const list = Array.from(map.values()).slice(-7);
    const maxRev = Math.max(...list.map((d) => d.revenue), 1);
    return { list, maxRev };
  }, [filteredSales]);

  // Gráfica 2: Ingresos por Ventas vs Valor en Stock por Categoría
  const categoryAnalytics = useMemo(() => {
    const catMap = new Map<
      string,
      { category: string; revenue: number; unitsSold: number; stockValue: number; stockUnits: number }
    >();

    for (const p of products) {
      const cat = p.category || "General";
      const entry = catMap.get(cat) || {
        category: cat,
        revenue: 0,
        unitsSold: 0,
        stockValue: 0,
        stockUnits: 0,
      };
      const stock = Math.max(0, Number(p.stock) || 0);
      entry.stockUnits += stock;
      entry.stockValue += stock * (Number(p.price) || 0);
      catMap.set(cat, entry);
    }

    for (const s of filteredSales) {
      for (const item of s.items || []) {
        const pid = item.product?.id;
        const prod = pid ? productById.get(pid) : undefined;
        const cat = prod?.category || "General";
        const entry = catMap.get(cat) || {
          category: cat,
          revenue: 0,
          unitsSold: 0,
          stockValue: 0,
          stockUnits: 0,
        };
        entry.revenue +=
          Number(item.subtotal) || Number(item.unitPrice) * Number(item.quantity) || 0;
        entry.unitsSold += Number(item.quantity) || 0;
        catMap.set(cat, entry);
      }
    }

    const rows = Array.from(catMap.values()).sort(
      (a, b) => b.revenue - a.revenue || b.stockValue - a.stockValue
    );
    const maxMetric = Math.max(...rows.map((r) => Math.max(r.revenue, r.stockValue)), 1);
    return { rows, maxMetric };
  }, [products, filteredSales, productById]);

  // Gráfica 3: Participación por Método de Pago (Donut SVG)
  const paymentDistribution = useMemo(() => {
    const totals: Record<"card" | "yape" | "mercadopago", { count: number; amount: number }> = {
      card: { count: 0, amount: 0 },
      yape: { count: 0, amount: 0 },
      mercadopago: { count: 0, amount: 0 },
    };

    for (const s of filteredSales) {
      const key = normalizePaymentMethod(s.paymentMethod);
      totals[key].count += 1;
      totals[key].amount += Number(s.total) || 0;
    }

    const grandTotal = Math.max(
      totals.card.amount + totals.yape.amount + totals.mercadopago.amount,
      1
    );

    return [
      {
        key: "card" as const,
        label: "Tarjeta",
        color: "#27557a",
        count: totals.card.count,
        amount: totals.card.amount,
        pct: Math.round((totals.card.amount / grandTotal) * 100),
      },
      {
        key: "yape" as const,
        label: "Yape",
        color: "#3b82f6",
        count: totals.yape.count,
        amount: totals.yape.amount,
        pct: Math.round((totals.yape.amount / grandTotal) * 100),
      },
      {
        key: "mercadopago" as const,
        label: "MercadoPago",
        color: "#0ea5e9",
        count: totals.mercadopago.count,
        amount: totals.mercadopago.amount,
        pct: Math.round((totals.mercadopago.amount / grandTotal) * 100),
      },
    ];
  }, [filteredSales]);

  // Matriz de Inteligencia Comercial: Top Más Vendidos vs Candidatos a Promoción (Sobrestock / Baja Rotación)
  const productPerformance = useMemo(() => {
    const soldMap = new Map<number, { units: number; revenue: number }>();

    for (const s of filteredSales) {
      for (const it of s.items || []) {
        const pid = it.product?.id;
        if (!pid) continue;
        const prev = soldMap.get(pid) || { units: 0, revenue: 0 };
        prev.units += Number(it.quantity) || 0;
        prev.revenue +=
          Number(it.subtotal) || Number(it.unitPrice) * Number(it.quantity) || 0;
        soldMap.set(pid, prev);
      }
    }

    const enriched = filteredProducts.map((p) => {
      const stats = soldMap.get(p.id) || { units: 0, revenue: 0 };
      const stock = Number(p.stock ?? 0);
      return {
        ...p,
        unitsSold: stats.units,
        revenue: stats.revenue,
        stock,
        stockCapital: stock * Number(p.price || 0),
      };
    });

    const topSellers = [...enriched]
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 5);

    const promotionCandidates = [...enriched]
      .filter((p) => p.stock >= 5)
      .sort((a, b) => a.unitsSold - b.unitsSold || b.stock - a.stock)
      .slice(0, 5);

    return { topSellers, promotionCandidates };
  }, [filteredProducts, filteredSales]);

  const handleSelectCandidateForPromo = (prod: Product) => {
    setPromoProductId(String(prod.id));
    const discounted = (Number(prod.price) * 0.85).toFixed(2);
    setPromoMessage(
      `Promoción en ${prod.name}: 15% de descuento por tiempo limitado (S/ ${discounted}). Unidades disponibles en stock.`
    );
    const el = document.getElementById("panel-promociones-admin");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSendPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoMessage.trim()) return;

    const selectedProd = products.find((p) => String(p.id) === promoProductId);
    const payload: Record<string, any> = {
      type: "PROMOTION",
      message: promoMessage.trim(),
      data: {
        productId: selectedProd ? selectedProd.id : undefined,
        productName: selectedProd ? selectedProd.name : undefined,
        price: selectedProd ? selectedProd.price : undefined,
      },
    };

    const sent = sendRealtimeBroadcast(payload);
    if (sent) {
      setPromoStatus("Campaña enviada en tiempo real a todos los clientes conectados.");
      setPromoMessage("");
      setPromoProductId("");
      setTimeout(() => setPromoStatus(null), 5000);
    } else {
      setPromoStatus("Reconectando con el servidor WebSocket. Intenta nuevamente en unos segundos.");
    }
  };

  const handleResetFilters = () => {
    setPeriodFilter("all");
    setCategoryFilter("all");
    setPaymentFilter("all");
    setStockFilter("all");
  };

  const hasActiveFilters =
    periodFilter !== "all" ||
    categoryFilter !== "all" ||
    paymentFilter !== "all" ||
    stockFilter !== "all";

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await updateUserProfile({
        fullName: nombre,
        phone: telefono,
        address: direccion,
      });
      setSuccess("Datos de administrador actualizados correctamente.");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar los 5MB");
      return;
    }

    setError(null);
    setSuccess(null);
    setUploadingImage(true);

    try {
      const response = await uploadProfileImage(file);
      if (response.imageUrl) {
        setProfileImageUrl(response.imageUrl);
        setSuccess("Foto de perfil actualizada.");
      }
    } catch (err: any) {
      setError(err.message || "Error al subir la imagen");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--Primary_0)] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Encabezado Corporativo del Dashboard BI */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#27557a] text-white flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#27557a]">
                    Panel de Inteligencia Comercial y Control en Tiempo Real
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#27557a]/10 text-[#27557a]">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    Sincronización Activa
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  Administrador: <strong className="text-gray-800">{nombre || correo}</strong> — Análisis de ingresos, rotación de inventario y difusión de promociones.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => navigate("/inventario")}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#27557a] hover:bg-[#1e4361] text-white font-medium rounded-md shadow-xs transition cursor-pointer text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Gestión de Inventario</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/boletas-facturas")}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-[#27557a] border border-[#27557a] font-medium rounded-md transition cursor-pointer text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Boletas y Facturas</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileEditor((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md transition cursor-pointer text-sm"
              >
                <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{showProfileEditor ? "Ocultar Mis Datos" : "Mis Datos"}</span>
              </button>
            </div>
          </div>

          {/* Barra de Segmentadores Interactivos (Filtros BI) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Periodo de Ventas
                  </label>
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#27557a]"
                  >
                    <option value="all">Todo el historial</option>
                    <option value="today">Hoy</option>
                    <option value="7d">Últimos 7 días</option>
                    <option value="30d">Últimos 30 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Categoría de Repuesto
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#27557a]"
                  >
                    <option value="all">Todas las categorías</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Medio de Pago
                  </label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#27557a]"
                  >
                    <option value="all">Todos los medios</option>
                    <option value="card">Tarjeta</option>
                    <option value="yape">Yape</option>
                    <option value="mercadopago">MercadoPago</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Estado de Inventario
                  </label>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#27557a]"
                  >
                    <option value="all">Todos los productos</option>
                    <option value="critical">Stock crítico (1 a 5 uds.)</option>
                    <option value="normal">Stock óptimo (&gt; 5 uds.)</option>
                    <option value="out">Agotados (0 uds.)</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-semibold text-[#27557a] bg-[#27557a]/10 hover:bg-[#27557a]/20 rounded-md transition cursor-pointer shrink-0"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          </div>

          {/* 4 Tarjetas KPI de Inteligencia de Negocios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Ingresos Totales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#27557a] p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Ingresos por Ventas
                </span>
                <svg className="w-5 h-5 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                S/ {totalRevenue.toFixed(2)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Ticket prom.: S/ {averageTicket.toFixed(2)}</span>
                {liveSessionDelta > 0 && (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    + S/ {liveSessionDelta.toFixed(2)} hoy
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Órdenes Procesadas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#3b7097] p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Órdenes Procesadas
                </span>
                <svg className="w-5 h-5 text-[#3b7097]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalOrders}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Transacciones confirmadas</span>
                {liveNewOrdersCount > 0 && (
                  <span className="font-semibold text-[#27557a] bg-[#27557a]/10 px-2 py-0.5 rounded">
                    +{liveNewOrdersCount} en sesión
                  </span>
                )}
              </div>
            </div>

            {/* KPI 3: Unidades Comercializadas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#4a8db7] p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Repuestos Vendidos
                </span>
                <svg className="w-5 h-5 text-[#4a8db7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {totalUnitsSold} <span className="text-sm font-normal text-gray-500">uds.</span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Promedio:{" "}
                {totalOrders > 0 ? (totalUnitsSold / totalOrders).toFixed(1) : "0.0"} uds. por orden
              </p>
            </div>

            {/* KPI 4: Valorización de Inventario */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-slate-600 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Capital en Inventario
                </span>
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                S/ {inventoryValuation.toFixed(2)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{totalStockUnits} uds. en almacén</span>
                {criticalStockCount > 0 && (
                  <span className="font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {criticalStockCount} críticos
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fila de Gráficas BI: Evolución de Ingresos + Participación por Medio de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfica de Columnas: Evolución de Ingresos por Fecha */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-[#27557a]">
                    Evolución de Ingresos y Volumen de Ventas
                  </h2>
                  <p className="text-xs text-gray-500">
                    Ingresos diarios en Soles (S/) registrados en las fechas activas del periodo seleccionado
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  Actualización automática en vivo
                </span>
              </div>

              {loadingDashboard ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Cargando series de ventas...
                </div>
              ) : revenueByDateSeries.list.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  No hay ventas registradas para los filtros seleccionados.
                </div>
              ) : (
                <div className="pt-6">
                  <div className="h-56 flex items-end justify-around gap-3 border-b border-gray-200 pb-2 px-2">
                    {revenueByDateSeries.list.map((point) => {
                      const heightPct = Math.max(
                        10,
                        Math.round((point.revenue / revenueByDateSeries.maxRev) * 100)
                      );
                      return (
                        <div
                          key={point.label}
                          className="flex-1 flex flex-col items-center justify-end h-full group"
                        >
                          <span className="text-[11px] font-bold text-[#27557a] mb-1.5">
                            S/ {point.revenue.toFixed(0)}
                          </span>
                          <div className="w-full max-w-[52px] bg-gray-100 rounded-t-md h-40 flex items-end overflow-hidden">
                            <div
                              className="w-full bg-[#27557a] group-hover:bg-[#3b7097] transition-all duration-500 rounded-t-md"
                              style={{ height: `${heightPct}%` }}
                              title={`${point.label}: S/ ${point.revenue.toFixed(2)} (${point.orders} órdenes)`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-around gap-3 pt-2 px-2">
                    {revenueByDateSeries.list.map((point) => (
                      <div key={point.label} className="flex-1 text-center">
                        <p className="text-xs font-semibold text-gray-700">{point.label}</p>
                        <p className="text-[10px] text-gray-400">
                          {point.orders} {point.orders === 1 ? "orden" : "órdenes"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gráfica de Anillo (Donut): Distribución por Medio de Pago */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-[#27557a]">
                  Ingresos por Medio de Pago
                </h2>
                <p className="text-xs text-gray-500">
                  Haz clic en un medio de pago para segmentar el dashboard
                </p>
              </div>

              <div className="my-4 flex items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="3.8"
                    />
                    {(() => {
                      let accumulated = 0;
                      return paymentDistribution.map((slice) => {
                        const dash = `${slice.pct} ${100 - slice.pct}`;
                        const offset = 100 - accumulated;
                        accumulated += slice.pct;
                        return (
                          <circle
                            key={slice.key}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="3.8"
                            strokeDasharray={dash}
                            strokeDashoffset={offset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-semibold text-gray-400">
                      Total
                    </span>
                    <span className="text-sm font-bold text-[#27557a]">
                      S/ {totalRevenue.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {paymentDistribution.map((item) => {
                  const isSelected = paymentFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setPaymentFilter(isSelected ? "all" : item.key)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs transition cursor-pointer ${
                        isSelected
                          ? "border-[#27557a] bg-[#27557a]/5 font-semibold"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-800">{item.label}</span>
                        <span className="text-gray-400">({item.count})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          S/ {item.amount.toFixed(2)}
                        </span>
                        <span className="text-gray-500 w-9 text-right">
                          {item.pct}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfica Comparativa Horizontal: Ventas vs Valor de Stock por Categoría */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#27557a]">
                  Desempeño por Categoría: Ingresos Generados vs. Capital en Stock
                </h2>
                <p className="text-xs text-gray-500">
                  Selecciona cualquier categoría para filtrar las tablas y detectar dónde concentrar campañas promocionales
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium">
                  <span className="h-3 w-3 rounded-xs bg-[#27557a]" />
                  Ventas (S/)
                </span>
                <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium">
                  <span className="h-3 w-3 rounded-xs bg-[#93c5fd]" />
                  Capital en Stock (S/)
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {categoryAnalytics.rows.map((row) => {
                const revWidth = Math.round((row.revenue / categoryAnalytics.maxMetric) * 100);
                const stockWidth = Math.round(
                  (row.stockValue / categoryAnalytics.maxMetric) * 100
                );
                const active =
                  categoryFilter.toLowerCase() === row.category.toLowerCase();

                return (
                  <div
                    key={row.category}
                    onClick={() =>
                      setCategoryFilter(active ? "all" : row.category)
                    }
                    className={`p-3 rounded-md border transition cursor-pointer ${
                      active
                        ? "border-[#27557a] bg-[#27557a]/5"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-gray-800">{row.category}</span>
                      <span className="text-gray-500">
                        Vendidos: <strong>{row.unitsSold} uds.</strong> | En almacén:{" "}
                        <strong>{row.stockUnits} uds.</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] mb-1">
                      <span className="w-16 text-gray-500 shrink-0">Ventas:</span>
                      <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#27557a] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(revWidth, row.revenue > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-semibold text-[#27557a]">
                        S/ {row.revenue.toFixed(0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-16 text-gray-500 shrink-0">Stock:</span>
                      <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#93c5fd] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(stockWidth, row.stockValue > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-medium text-gray-600">
                        S/ {row.stockValue.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matriz de Decisiones Comerciales: Top Rotación vs Candidatos a Promoción */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabla 1: Top Productos Más Vendidos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#27557a]">
                    Top Repuestos con Mayor Rotación
                  </h2>
                  <p className="text-xs text-gray-500">
                    Productos líderes en unidades comercializadas e ingresos
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                      <th className="py-3 px-4">Repuesto</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3 text-center">Vendidos</th>
                      <th className="py-3 px-3 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productPerformance.topSellers.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          {p.category || "General"}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#27557a]">
                          {p.unitsSold} uds.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              p.stock <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {p.stock} uds.
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                          S/ {p.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla 2: Recomendación BI de Productos para Promocionar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#27557a]">
                    Sugerencias de Promoción (Sobrestock / Baja Rotación)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Repuestos con alto inventario disponible recomendados para campañas de descuento
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                      <th className="py-3 px-4">Repuesto</th>
                      <th className="py-3 px-3 text-center">Stock</th>
                      <th className="py-3 px-3 text-center">Ventas</th>
                      <th className="py-3 px-3 text-right">Precio</th>
                      <th className="py-3 px-4 text-right">Acción Comercial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productPerformance.promotionCandidates.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-700">
                          {p.stock} uds.
                        </td>
                        <td className="py-3 px-3 text-center text-gray-500">
                          {p.unitsSold} uds.
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-gray-800">
                          S/ {Number(p.price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectCandidateForPromo(p)}
                            className="px-2.5 py-1 rounded bg-[#27557a] hover:bg-[#1e4361] text-white font-medium text-[11px] transition cursor-pointer"
                          >
                            Promocionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Difusión de Promociones en Tiempo Real + Flujo de Últimas Ventas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Emisor de Campañas Promocionales */}
            <div
              id="panel-promociones-admin"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="pb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-[#27557a]">
                    Difusión de Promoción en Tiempo Real
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Envía una notificación instantánea con enlace directo al producto hacia todos los clientes conectados
                  </p>
                </div>

                <form onSubmit={handleSendPromotion} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      Producto a promocionar
                    </label>
                    <select
                      value={promoProductId}
                      onChange={(e) => setPromoProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#27557a]"
                    >
                      <option value="">Catálogo general (sin producto específico)</option>
                      {products.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name} — S/ {Number(p.price).toFixed(2)} ({p.stock ?? 0} uds.)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      Mensaje para el cliente
                    </label>
                    <textarea
                      rows={3}
                      value={promoMessage}
                      onChange={(e) => setPromoMessage(e.target.value)}
                      placeholder="Ej. Descuento especial de 15% en repuestos seleccionados por tiempo limitado."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#27557a]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!promoMessage.trim()}
                    className="w-full py-2.5 px-4 bg-[#27557a] hover:bg-[#1e4361] disabled:opacity-50 text-white font-medium text-sm rounded-md transition cursor-pointer"
                  >
                    Emitir promoción a clientes conectados
                  </button>

                  {promoStatus && (
                    <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
                      {promoStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* Registro de Últimas Transacciones en Vivo */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#27557a]">
                    Registro de Transacciones en Tiempo Real
                  </h2>
                  <p className="text-xs text-gray-500">
                    Las compras realizadas por los clientes se reflejan automáticamente sin recargar la página
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/boletas-facturas")}
                  className="text-xs font-semibold text-[#27557a] hover:underline cursor-pointer"
                >
                  Ver historial completo
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                      <th className="py-3 px-4">Orden</th>
                      <th className="py-3 px-3">Cliente</th>
                      <th className="py-3 px-3">Detalle de Compra</th>
                      <th className="py-3 px-3">Medio Pago</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSales.slice(0, 7).map((sale) => {
                      const isRealtimeNew = recentRealtimeIds.includes(sale.id);
                      const methodKey = normalizePaymentMethod(sale.paymentMethod);
                      return (
                        <tr
                          key={sale.id}
                          className={isRealtimeNew ? "bg-emerald-50/70" : "hover:bg-gray-50"}
                        >
                          <td className="py-3 px-4 font-bold text-gray-900">
                            <div className="flex items-center gap-1.5">
                              <span>#{sale.id}</span>
                              {isRealtimeNew && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded">
                                  NUEVA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-800">
                              {sale.fullName || sale.user?.fullName || "Cliente"}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {sale.user?.email || ""}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-gray-600 max-w-xs truncate">
                            {(sale.items || [])
                              .map((i) => `${i.quantity}x ${i.product?.name || "Repuesto"}`)
                              .join(", ") || "Repuestos"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                              {formatPaymentLabel(methodKey)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#27557a]">
                            S/ {Number(sale.total || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sección Desplegable de Datos del Perfil del Administrador */}
          {showProfileEditor && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-200">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#27557a] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {profileImageUrl ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || "http://localhost:8080"}${profileImageUrl}`}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : nombre ? (
                      nombre.charAt(0).toUpperCase()
                    ) : (
                      "A"
                    )}
                  </div>
                  <label
                    htmlFor="admin-profile-image-upload"
                    className="absolute bottom-0 right-0 bg-[#27557a] hover:bg-[#1e4361] text-white p-1.5 rounded-full cursor-pointer shadow transition"
                    title="Cambiar foto de perfil"
                  >
                    <input
                      id="admin-profile-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#27557a]">
                    Configuración de Cuenta de Administrador
                  </h2>
                  <p className="text-sm text-gray-600">{correo}</p>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSaveChanges} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Nombre del administrador"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={correo}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      disabled={!isEditing}
                      placeholder="999 999 999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Dirección de Sede
                    </label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Dirección"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-5 py-2.5 bg-[#27557a] text-white font-medium rounded-md hover:bg-[#1e4361] transition cursor-pointer text-sm"
                    >
                      Editar información
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition cursor-pointer text-sm"
                      >
                        {loading ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition cursor-pointer text-sm"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
export default AdminProfile;
