import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getMyOrders, getSaleById, type PaymentSale } from "../api/payments";
import { getToken } from "../utils/token";

function formatCurrency(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE");
}

function getDisplayDocumentType(documentType: string) {
  return documentType?.toLowerCase() === "dni" ? "Boleta" : "Factura";
}

export function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PaymentSale[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PaymentSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    void loadOrders();
  }, [navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyOrders();
      setOrders(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al cargar los pedidos");
      }
    } finally {
      setLoading(false);
    }
  };

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const openOrder = async (orderId: number) => {
    try {
      setDetailsLoading(true);
      setError(null);
      const sale = await getSaleById(orderId);
      setSelectedOrder(sale);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al obtener el detalle del pedido");
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--Primary_0)] py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
              <p className="text-gray-600 mt-1">
                Revisa tus compras, su estado y el detalle de cada orden.
              </p>
            </div>
            <button
              onClick={() => navigate("/user-profile")}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Regresar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--Primary_5)]"></div>
              <p className="mt-4 text-gray-600">Cargando pedidos...</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Aún no tienes pedidos</h2>
              <p className="text-gray-600 mb-4">Cuando realices una compra, la verás aquí.</p>
              <button
                onClick={() => navigate("/products")}
                className="px-5 py-3 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] transition-colors"
              >
                Ver productos
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedOrders.map((order) => (
                <article
                  key={order.id}
                  className="bg-white rounded-lg shadow-md p-5 border border-gray-100"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {getDisplayDocumentType(order.documentType)} - {order.status}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Fecha: {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Método de pago: {order.paymentMethod}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-500">Total pagado</p>
                      <p className="text-2xl font-bold text-[var(--Primary_5)]">
                        {formatCurrency(order.total)}
                      </p>
                      <button
                        onClick={() => void openOrder(order.id)}
                        className="mt-3 px-4 py-2 bg-[var(--Primary_5)] cursor-pointer text-white rounded-md hover:bg-[#1e4a6f] transition-colors"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Detalle del pedido #{selectedOrder.id}
                </h3>
                <p className="text-sm text-gray-500">
                  {getDisplayDocumentType(selectedOrder.documentType)} - {selectedOrder.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {detailsLoading ? (
                <p className="text-gray-600">Cargando detalle...</p>
              ) : (
                <>
                  <section className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500">Cliente</p>
                      <p className="font-medium text-gray-900">{selectedOrder.fullName}</p>
                      <p className="text-gray-600">{selectedOrder.phone}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500">Entrega</p>
                      <p className="font-medium text-gray-900">{selectedOrder.deliveryMethod}</p>
                      <p className="text-gray-600">
                        {selectedOrder.deliveryAddress || "Sin dirección registrada"}
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Productos</h4>
                    <div className="space-y-3">
                      {(selectedOrder.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 border rounded-lg p-4"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.product?.name || `Producto #${item.product?.id || item.id}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} x {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Envío</span>
                      <span>{formatCurrency(selectedOrder.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
