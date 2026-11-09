import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import { getRole } from "../../utils/token";

export interface RealtimeEventPayload {
  id?: string;
  type: string;
  message?: string;
  data?: Record<string, any>;
  activeClients?: number;
  timestamp?: string;
}

interface FormattedNotification {
  title: string;
  description: string;
  actionHref: string | null;
  actionLabel: string | null;
  category: "sale" | "stock" | "product" | "promo" | "review" | "info";
}

interface RealtimeStoreState {
  connected: boolean;
  activeClients: number;
  history: RealtimeEventPayload[];
  unreadCount: number;
}

let activeSocketInstance: WebSocket | null = null;

const store: RealtimeStoreState = {
  connected: false,
  activeClients: 1,
  history: [],
  unreadCount: 0,
};

function notifyStoreListeners() {
  window.dispatchEvent(new Event("hurios-realtime-store-update"));
}

/**
 * Envía un evento en tiempo real desde el cliente (ej. campaña promocional del Administrador)
 * hacia todos los usuarios conectados a través del servidor WebSocket.
 */
export function sendRealtimeBroadcast(payload: Record<string, any>): boolean {
  if (activeSocketInstance && activeSocketInstance.readyState === WebSocket.OPEN) {
    activeSocketInstance.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

function resolveWebSocketUrl(): string {
  const base = (API_BASE_URL || "http://localhost:8080").trim().replace(/\/+$/, "");
  if (base.startsWith("https://")) {
    return base.replace(/^https:\/\//, "wss://") + "/ws/events";
  }
  if (base.startsWith("http://")) {
    return base.replace(/^http:\/\//, "ws://") + "/ws/events";
  }
  return `ws://${base}/ws/events`;
}

/**
 * Adapta el título, mensaje y enlace de acción según el rol activo en la pestaña
 * (ADMINISTRADOR vs CLIENTE), evitando mostrar mensajes administrativos al cliente.
 */
function formatNotificationForRole(
  evt: RealtimeEventPayload,
  isAdmin: boolean
): FormattedNotification {
  const data = evt.data || {};
  const productId = data.productId ?? (evt as any).productId;
  const productName = data.productName ?? (evt as any).productName;

  switch (evt.type) {
    case "NEW_SALE": {
      if (isAdmin) {
        const orderLabel = data.orderId ? `#${data.orderId}` : "reciente";
        const amountLabel =
          data.total !== undefined ? ` por S/ ${Number(data.total).toFixed(2)}` : "";
        return {
          title: "Nueva venta registrada",
          description: `Se procesó la orden ${orderLabel}${amountLabel}. Los indicadores del dashboard y el stock han sido actualizados.`,
          actionHref: "/boletas-facturas",
          actionLabel: "Ver comprobantes",
          category: "sale",
        };
      }
      return {
        title: "Disponibilidad actualizada",
        description:
          "Se registró una compra reciente en la tienda y el stock disponible del catálogo fue actualizado.",
        actionHref: "/products",
        actionLabel: "Ver catálogo",
        category: "stock",
      };
    }

    case "STOCK_UPDATED":
    case "PRODUCT_UPDATED": {
      if (isAdmin) {
        return {
          title: "Movimiento de inventario",
          description: productName
            ? `El stock de "${productName}" se actualizó a ${data.newStock ?? 0} unidades disponibles.`
            : evt.message || "Se actualizó el inventario de productos.",
          actionHref: "/inventario",
          actionLabel: "Ir a inventario",
          category: "stock",
        };
      }
      return {
        title: "Stock disponible actualizado",
        description: productName
          ? `El repuesto "${productName}" cuenta ahora con ${data.newStock ?? 0} unidades disponibles para compra.`
          : "Se actualizó la disponibilidad de unidades en el catálogo.",
        actionHref: productId
          ? `/products?highlight=${encodeURIComponent(String(productId))}`
          : "/products",
        actionLabel: productId ? "Ver repuesto" : "Ver catálogo",
        category: "stock",
      };
    }

    case "PRODUCT_CREATED": {
      const priceText =
        data.price !== undefined ? ` (S/ ${Number(data.price).toFixed(2)})` : "";
      if (isAdmin) {
        return {
          title: "Producto incorporado al catálogo",
          description: productName
            ? `Se dio de alta "${productName}"${priceText} correctamente en el sistema.`
            : evt.message || "Nuevo producto registrado en el catálogo.",
          actionHref: productId
            ? `/products?highlight=${encodeURIComponent(String(productId))}`
            : "/inventario",
          actionLabel: productId ? "Ver en catálogo" : "Ver inventario",
          category: "product",
        };
      }
      return {
        title: "Nuevo repuesto disponible",
        description: productName
          ? `Ya se encuentra disponible "${productName}"${priceText} en nuestra tienda.`
          : evt.message || "Se agregó un nuevo repuesto al catálogo.",
        actionHref: productId
          ? `/products?highlight=${encodeURIComponent(String(productId))}`
          : "/products",
        actionLabel: "Ver producto",
        category: "product",
      };
    }

    case "PROMOTION": {
      if (isAdmin) {
        return {
          title: "Campaña promocional emitida",
          description: `Notificación enviada a los clientes activos: "${evt.message || ""}"`,
          actionHref: productId
            ? `/products?highlight=${encodeURIComponent(String(productId))}`
            : null,
          actionLabel: productId ? "Ver producto promocionado" : null,
          category: "promo",
        };
      }
      return {
        title: "Promoción disponible en tienda",
        description: evt.message || "Tenemos un descuento especial disponible en nuestro catálogo.",
        actionHref: productId
          ? `/products?highlight=${encodeURIComponent(String(productId))}`
          : "/products",
        actionLabel: productId ? "Ver producto en oferta" : "Ver catálogo",
        category: "promo",
      };
    }

    case "NEW_REVIEW": {
      const stars = data.rating ? ` (${data.rating}/5)` : "";
      if (isAdmin) {
        return {
          title: `Nueva valoración de cliente${stars}`,
          description: evt.message || "Un comprador registró una reseña sobre un producto.",
          actionHref: productId
            ? `/products?highlight=${encodeURIComponent(String(productId))}`
            : "/products",
          actionLabel: "Revisar calificación",
          category: "review",
        };
      }
      return {
        title: `Nueva opinión de comprador${stars}`,
        description:
          "Un cliente compartió su experiencia sobre un repuesto del catálogo.",
        actionHref: productId
          ? `/products?highlight=${encodeURIComponent(String(productId))}`
          : "/products",
        actionLabel: "Ver opiniones",
        category: "review",
      };
    }

    default:
      return {
        title: isAdmin ? "Aviso del sistema" : "Novedad en tienda",
        description: evt.message || "Se actualizó la información del catálogo.",
        actionHref: productId
          ? `/products?highlight=${encodeURIComponent(String(productId))}`
          : null,
        actionLabel: productId ? "Ver detalle" : null,
        category: "info",
      };
  }
}

function CategoryIcon({ category }: { category: FormattedNotification["category"] }) {
  switch (category) {
    case "sale":
      return (
        <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      );
    case "stock":
      return (
        <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "product":
      return (
        <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case "promo":
      return (
        <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case "review":
      return (
        <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-[#27557a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

/**
 * Botón de campana de notificaciones ubicado en el Navbar junto al icono de perfil,
 * con el mismo estilo visual (círculo blanco de 40x40 e icono #27557a).
 */
export function NavbarNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = getRole() === "ADMINISTRADOR";

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener("hurios-realtime-store-update", onUpdate);
    window.addEventListener("hurios-auth-change", onUpdate);
    return () => {
      window.removeEventListener("hurios-realtime-store-update", onUpdate);
      window.removeEventListener("hurios-auth-change", onUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && store.unreadCount > 0) {
      store.unreadCount = 0;
      notifyStoreListeners();
    }
  };

  const handleClearHistory = () => {
    store.history = [];
    store.unreadCount = 0;
    notifyStoreListeners();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notificaciones"
        title={
          store.connected
            ? `Notificaciones en tiempo real (${store.activeClients} conectado${
                store.activeClients === 1 ? "" : "s"
              })`
            : "Sincronizando canal de notificaciones"
        }
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-white text-[#27557a] hover:scale-105 transition flex-shrink-0 cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>

        {/* Indicador discreto de conexión activa */}
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#27557a] ${
            store.connected ? "bg-emerald-500" : "bg-amber-400"
          }`}
        />

        {/* Contador de notificaciones no leídas */}
        {store.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {store.unreadCount > 9 ? "9+" : store.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#27557a]">Notificaciones</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#27557a]/10 text-[#27557a]">
                  {isAdmin ? "Vista Administrador" : "Vista Cliente"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    store.connected ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                {store.connected
                  ? `Canal activo (${store.activeClients} sesión${
                      store.activeClients === 1 ? "" : "es"
                    } en línea)`
                  : "Reconectando canal..."}
              </p>
            </div>
            {store.history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs text-gray-500 hover:text-[#27557a] cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {store.history.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-600 font-medium">Sin notificaciones nuevas</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isAdmin
                    ? "Aquí se registrarán las nuevas órdenes, cambios de stock y valoraciones en tiempo real."
                    : "Aquí recibirás avisos de nuevos repuestos, promociones y reposiciones de stock."}
                </p>
              </div>
            ) : (
              store.history.map((item) => {
                const formatted = formatNotificationForRole(item, isAdmin);
                return (
                  <div
                    key={item.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-[#27557a]/10 flex items-center justify-center shrink-0">
                      <CategoryIcon category={formatted.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[#27557a] truncate">
                          {formatted.title}
                        </p>
                        {item.timestamp && (
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                        {formatted.description}
                      </p>
                      {formatted.actionHref && formatted.actionLabel && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate(formatted.actionHref!);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#27557a] hover:underline cursor-pointer"
                        >
                          <span>{formatted.actionLabel}</span>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RealtimeNotifier() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<RealtimeEventPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      try {
        const wsUrl = resolveWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        activeSocketInstance = ws;

        ws.onopen = () => {
          if (unmounted) return;
          store.connected = true;
          notifyStoreListeners();
          if (pingIntervalRef.current) {
            window.clearInterval(pingIntervalRef.current);
          }
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "PING" }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const payload: RealtimeEventPayload = JSON.parse(event.data);
            if (typeof payload.activeClients === "number") {
              store.activeClients = payload.activeClients;
              notifyStoreListeners();
            }

            if (payload.type && payload.type !== "CONNECTION_READY" && payload.type !== "PONG") {
              const enriched: RealtimeEventPayload = {
                ...payload,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                timestamp: payload.timestamp || new Date().toISOString(),
              };

              window.dispatchEvent(
                new CustomEvent("hurios-realtime-event", { detail: enriched })
              );

              if (enriched.message) {
                store.history = [enriched, ...store.history].slice(0, 15);
                store.unreadCount += 1;
                notifyStoreListeners();

                // Para clientes, no mostrar aviso flotante de contabilidad interna NEW_SALE
                // (sí se guarda en su campana como actualización de disponibilidad)
                const currentIsAdmin = getRole() === "ADMINISTRADOR";
                if (!currentIsAdmin && enriched.type === "NEW_SALE") {
                  return;
                }

                setToast(enriched);
                if (toastTimerRef.current) {
                  window.clearTimeout(toastTimerRef.current);
                }
                toastTimerRef.current = window.setTimeout(() => {
                  setToast(null);
                }, 8000);
              }
            }
          } catch {
            // Ignorar tramas no JSON
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          store.connected = false;
          notifyStoreListeners();
          if (activeSocketInstance === ws) {
            activeSocketInstance = null;
          }
          if (pingIntervalRef.current) {
            window.clearInterval(pingIntervalRef.current);
          }
          reconnectTimerRef.current = window.setTimeout(connect, 4000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimerRef.current = window.setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  if (!toast) {
    return null;
  }

  const isAdmin = getRole() === "ADMINISTRADOR";
  const formatted = formatNotificationForRole(toast, isAdmin);

  return (
    <div className="fixed top-20 right-4 z-50 w-80 sm:w-96 bg-white text-gray-800 border border-gray-200 border-l-4 border-l-[#27557a] rounded-lg shadow-xl p-4 flex items-start gap-3 transition-all duration-300">
      <div className="mt-0.5 h-8 w-8 rounded-full bg-[#27557a]/10 flex items-center justify-center shrink-0">
        <CategoryIcon category={formatted.category} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#27557a]">{formatted.title}</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{formatted.description}</p>
        {formatted.actionHref && formatted.actionLabel && (
          <button
            type="button"
            onClick={() => {
              const href = formatted.actionHref!;
              setToast(null);
              navigate(href);
            }}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#27557a] hover:bg-[#1e4361] text-white font-medium text-xs transition-colors cursor-pointer"
          >
            <span>{formatted.actionLabel}</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setToast(null)}
        className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
