import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";

export interface RealtimeEventPayload {
  id?: string;
  type: string;
  message?: string;
  data?: Record<string, any>;
  activeClients?: number;
  timestamp?: string;
}

let activeSocketInstance: WebSocket | null = null;

/**
 * Permite enviar un evento en tiempo real desde el cliente (ej. promociones del Administrador)
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

function getEventBadge(type: string): { label: string; colorClass: string } {
  switch (type) {
    case "PRODUCT_CREATED":
      return { label: "¡Nuevo Producto!", colorClass: "text-emerald-400" };
    case "PROMOTION":
      return { label: "🔥 ¡Promoción Especial!", colorClass: "text-amber-400" };
    case "STOCK_UPDATED":
      return { label: "Stock Abastecido", colorClass: "text-sky-400" };
    case "PRODUCT_UPDATED":
      return { label: "Catálogo Actualizado", colorClass: "text-cyan-400" };
    case "NEW_SALE":
      return { label: "💰 Nueva Venta en Vivo", colorClass: "text-emerald-400" };
    case "NEW_REVIEW":
      return { label: "★ Nueva Valoración", colorClass: "text-yellow-400" };
    default:
      return { label: "Actualización en Tiempo Real", colorClass: "text-emerald-400" };
  }
}

function getActionLink(evt: RealtimeEventPayload): { href: string; label: string } | null {
  const data = evt.data || {};
  const productId = data.productId ?? (evt as any).productId;

  if (productId) {
    return {
      href: `/products?highlight=${encodeURIComponent(String(productId))}`,
      label: "Ver producto ahora →",
    };
  }
  if (evt.type === "PROMOTION" || evt.type === "PRODUCT_CREATED") {
    return {
      href: "/products",
      label: "Ir al catálogo →",
    };
  }
  return null;
}

export default function RealtimeNotifier() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [activeClients, setActiveClients] = useState<number>(1);
  const [toast, setToast] = useState<RealtimeEventPayload | null>(null);
  const [history, setHistory] = useState<RealtimeEventPayload[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
          setConnected(true);
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
              setActiveClients(payload.activeClients);
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
                setToast(enriched);
                setHistory((prev) => [enriched, ...prev].slice(0, 15));
                setUnreadCount((prev) => prev + 1);

                if (toastTimerRef.current) {
                  window.clearTimeout(toastTimerRef.current);
                }
                toastTimerRef.current = window.setTimeout(() => {
                  setToast(null);
                }, 9000);
              }
            }
          } catch {
            // Ignorar tramas no JSON
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setConnected(false);
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

  const toastBadge = toast ? getEventBadge(toast.type) : null;
  const toastLink = toast ? getActionLink(toast) : null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {/* Panel desplegable de historial de notificaciones en vivo */}
      {showHistory && (
        <div className="pointer-events-auto w-80 sm:w-96 max-h-96 bg-slate-900/95 text-white border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-1">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Notificaciones en Vivo ({history.length})
              </span>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-slate-400 hover:text-white text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto p-3 space-y-2.5 text-xs">
            {history.length === 0 ? (
              <p className="text-slate-400 text-center py-6">
                Aún no hay eventos recientes. Los nuevos productos, promociones y ventas aparecerán aquí en tiempo real.
              </p>
            ) : (
              history.map((item) => {
                const badge = getEventBadge(item.type);
                const link = getActionLink(item);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold uppercase text-[11px] ${badge.colorClass}`}>
                        {badge.label}
                      </span>
                      {item.timestamp && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-100 font-medium">{item.message}</p>
                    {link && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowHistory(false);
                          navigate(link.href);
                        }}
                        className="inline-block mt-1 text-xs font-semibold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        {link.label}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Alerta flotante (Toast) con enlace clicable */}
      {toast && toastBadge && (
        <div className="pointer-events-auto w-80 sm:w-96 bg-slate-900/95 text-white border border-slate-700 rounded-xl shadow-2xl px-4 py-3.5 flex items-start gap-3 transition-all duration-300">
          <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs leading-relaxed flex-1">
            <div className={`flex items-center gap-2 font-bold uppercase tracking-wider ${toastBadge.colorClass}`}>
              <span>{toastBadge.label}</span>
            </div>
            <p className="text-slate-100 mt-1 font-medium text-sm">{toast.message}</p>
            {toastLink && (
              <button
                type="button"
                onClick={() => {
                  const target = toastLink.href;
                  setToast(null);
                  navigate(target);
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                {toastLink.label}
              </button>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-xs ml-1 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* Botón indicador de conexión y campana de notificaciones */}
      <button
        type="button"
        onClick={() => {
          setShowHistory((prev) => !prev);
          setUnreadCount(0);
        }}
        title={
          connected
            ? `Conectado por WebSocket en tiempo real (${activeClients} ${
                activeClients === 1 ? "usuario conectado" : "usuarios conectados"
              }) — Clic para ver notificaciones`
            : "Reconectando canal WebSocket en tiempo real..."
        }
        className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 hover:bg-white backdrop-blur border border-gray-200 shadow-lg text-xs font-semibold text-gray-800 cursor-pointer transition-transform hover:scale-105"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            connected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
          }`}
        />
        <span>{connected ? `En vivo (${activeClients})` : "Sincronizando..."}</span>
        <span className="text-gray-400">|</span>
        <span className="inline-flex items-center gap-1 text-[var(--Primary_5)]">
          🔔
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
