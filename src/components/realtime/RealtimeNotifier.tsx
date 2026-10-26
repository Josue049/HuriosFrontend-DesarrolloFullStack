import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config/api";

export interface RealtimeEventPayload {
  type: string;
  message?: string;
  data?: Record<string, any>;
  activeClients?: number;
  timestamp?: string;
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

export default function RealtimeNotifier() {
  const [connected, setConnected] = useState(false);
  const [activeClients, setActiveClients] = useState<number>(1);
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
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (unmounted) return;
          setConnected(true);
          if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "PING" }));
            }
          }, 25000);
        };

        socket.onmessage = (event) => {
          if (unmounted) return;
          try {
            const payload: RealtimeEventPayload = JSON.parse(event.data);
            if (typeof payload.activeClients === "number") {
              setActiveClients(payload.activeClients);
            }

            if (payload.type && payload.type !== "CONNECTED" && payload.type !== "PONG") {
              // Emitir evento global en el navegador para actualizar vistas de catálogo/inventario en vivo
              window.dispatchEvent(
                new CustomEvent("hurios-realtime-event", { detail: payload })
              );

              setToast(payload);
              if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
              toastTimerRef.current = window.setTimeout(() => {
                setToast(null);
              }, 5500);
            }
          } catch {
            // Ignorar tramas no JSON
          }
        };

        socket.onclose = () => {
          if (unmounted) return;
          setConnected(false);
          if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
          reconnectTimerRef.current = window.setTimeout(connect, 5000);
        };

        socket.onerror = () => {
          socket.close();
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

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 pointer-events-none">
      {toast && (
        <div className="pointer-events-auto max-w-sm bg-slate-900/95 text-white border border-slate-700 rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 transition-all duration-300">
          <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-emerald-400 uppercase tracking-wider">
              <span>Actualización en Tiempo Real</span>
            </div>
            <p className="text-slate-100 mt-0.5 font-medium">{toast.message}</p>
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

      <div
        title={
          connected
            ? `Conectado por WebSocket en tiempo real (${activeClients} ${
                activeClients === 1 ? "cliente activo" : "clientes activos"
              })`
            : "Reconectando canal WebSocket en tiempo real..."
        }
        className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-md text-xs font-medium text-gray-700"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
          }`}
        />
        <span>{connected ? "Stock en vivo" : "Sincronizando..."}</span>
      </div>
    </div>
  );
}
