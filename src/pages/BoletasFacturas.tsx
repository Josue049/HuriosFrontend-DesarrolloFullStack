import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { getAllSales, getSaleById, type PaymentSale } from "../api/payments";
import { generateBoletaPDF, generateFacturaPDF } from "../utils/pdfGenerator";

type InvoiceRow = {
  id: number;
  client: string;
  amount: number;
  type: "boleta" | "factura";
  date: string;
  status: string;
};

function getInvoiceType(documentType: string): "boleta" | "factura" {
  return documentType?.toLowerCase() === "dni" ? "boleta" : "factura";
}

function formatCurrency(amount: number) {
  return `S/ ${amount.toFixed(2)}`;
}

function formatLongDate(date: string) {
  return new Date(date).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapSaleToInvoice(sale: PaymentSale): InvoiceRow {
  return {
    id: sale.id,
    client:
      sale.companyName ||
      sale.fullName ||
      sale.user?.email ||
      `Cliente #${sale.id}`,
    amount: sale.total,
    type: getInvoiceType(sale.documentType),
    date: sale.createdAt,
    status: sale.status,
  };
}

export default function BoletasFacturas() {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const current = new Date();
    current.setDate(1);
    return current;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sales, setSales] = useState<PaymentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    void loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSales();
      setSales(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al cargar las boletas y facturas");
      }
    } finally {
      setLoading(false);
    }
  };

  const invoices = useMemo(
    () =>
      sales
        .map(mapSaleToInvoice)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [sales],
  );

  const invoicesByDate = useMemo(() => {
    const grouped: Record<string, InvoiceRow[]> = {};

    invoices.forEach((invoice) => {
      const isoDate = new Date(invoice.date).toISOString().slice(0, 10);
      if (!grouped[isoDate]) {
        grouped[isoDate] = [];
      }
      grouped[isoDate].push(invoice);
    });

    return grouped;
  }, [invoices]);

  const selectedInvoices = selectedDate ? invoicesByDate[selectedDate] || [] : [];

  const daysInVisibleMonth = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: lastDay }, (_, index) => {
      const date = new Date(year, month, index + 1);
      const iso = date.toISOString().slice(0, 10);

      return {
        iso,
        dayNumber: index + 1,
        items: invoicesByDate[iso] || [],
      };
    });
  }, [invoicesByDate, visibleMonth]);

  const handleDownload = async (invoiceId: number) => {
    try {
      setDownloadId(invoiceId);
      setError(null);

      const sale = await getSaleById(invoiceId);
      const items = (sale.items || []).map((item) => ({
        name: item.product?.name || `Producto #${item.product?.id || item.id}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.subtotal,
      }));

      const currentDate = new Date(sale.createdAt).toLocaleDateString("es-PE");
      const paymentMethodLabel = sale.paymentMethod;
      const deliveryMethodLabel = sale.deliveryMethod;
      const invoiceType = getInvoiceType(sale.documentType);
      const paddedId = String(sale.id).padStart(5, "0");

      if (invoiceType === "boleta") {
        await generateBoletaPDF({
          boletaNumber: `B001-${paddedId}`,
          date: currentDate,
          clientName: sale.fullName,
          clientDNI: sale.dni || "---",
          items,
          subtotal: sale.subtotal,
          igv: sale.total - sale.total / 1.18,
          total: sale.total,
          paymentMethod: paymentMethodLabel,
          deliveryMethod: deliveryMethodLabel,
        });
      } else {
        await generateFacturaPDF({
          facturaNumber: `F001-${paddedId}`,
          date: currentDate,
          clientName: sale.companyName || sale.fullName,
          clientRUC: sale.ruc || "---",
          clientAddress: sale.companyAddress || sale.deliveryAddress || "---",
          items,
          subtotal: sale.subtotal,
          anticipos: 0,
          descuentos: 0,
          valorVenta: sale.total / 1.18,
          isc: 0,
          igv: sale.total - sale.total / 1.18,
          total: sale.total,
          paymentMethod: paymentMethodLabel,
          deliveryMethod: deliveryMethodLabel,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo descargar el comprobante");
      }
    } finally {
      setDownloadId(null);
    }
  };

  const goPrevMonth = () =>
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const goNextMonth = () =>
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const firstWeekday = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay();

  return (
    <>
      <Navbar />
      <main className="px-4 py-5 sm:px-6 max-w-5xl mx-auto">
        <section className="bg-white/90 border border-white/20 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin-profile")}
                className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
              >
                Regresar
              </button>
              <div>
                <h1 className="text-2xl font-semibold">Boletas/Facturas</h1>
                <p className="text-sm text-gray-500">
                  Revisa ventas reales registradas en el sistema.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <div className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-500 tracking-wide">
                {visibleMonth
                  .toLocaleString("es-PE", { month: "long", year: "numeric" })
                  .toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrevMonth}
                  className="w-9 h-9 border rounded-md hover:bg-gray-50"
                >
                  {"<"}
                </button>
                <button
                  onClick={goNextMonth}
                  className="w-9 h-9 border rounded-md hover:bg-gray-50"
                >
                  {">"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                <div key={day} className="text-sm font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 auto-rows-[64px] sm:auto-rows-[74px]">
              {Array.from({ length: firstWeekday }, (_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {daysInVisibleMonth.map((day) => {
                const count = day.items.length;
                const isSelected = selectedDate === day.iso;
                const hasPurchases = count > 0;

                let cellClassName =
                  "h-full rounded-lg border p-2 text-left transition-colors ";

                if (isSelected) {
                  cellClassName +=
                    "bg-emerald-600 border-emerald-600 text-white shadow-sm ";
                } else if (hasPurchases) {
                  cellClassName +=
                    "bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200 ";
                } else {
                  cellClassName +=
                    "bg-white border-gray-200 text-gray-900 hover:bg-gray-50 ";
                }

                return (
                  <button
                    key={day.iso}
                    onClick={() =>
                      setSelectedDate((current) =>
                        current === day.iso ? null : day.iso,
                      )
                    }
                    className={cellClassName}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <span className="text-base font-semibold">{day.dayNumber}</span>

                      {hasPurchases && (
                        <div
                          className={`text-[11px] leading-tight ${isSelected ? "text-emerald-50" : "text-emerald-700"}`}
                        >
                          <div className="font-medium">
                            {count} compra{count === 1 ? "" : "s"}
                          </div>
                          <div>registrada{count === 1 ? "" : "s"}</div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold">Compras del día</h2>
                <p className="text-sm text-gray-500">
                  {selectedDate
                    ? formatLongDate(selectedDate)
                    : "Selecciona un dia del calendario para ver sus compras."}
                </p>
              </div>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-white"
                >
                  Limpiar filtro
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-gray-600">Cargando ventas...</p>
            ) : !selectedDate ? (
              <p className="text-sm text-gray-500">
                Elige un día resaltado en verde para revisar las compras de esa fecha.
              </p>
            ) : selectedInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">No hay compras registradas para este día.</p>
            ) : (
              <div className="space-y-4">
                {selectedInvoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Compra #{invoice.id}</p>
                        <h3 className="text-xl font-semibold text-gray-900">{invoice.client}</h3>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="capitalize">{invoice.type}</span>
                          <span className="mx-2">•</span>
                          <span>{invoice.status}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(invoice.date).toLocaleDateString("es-PE")}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <p className="text-2xl font-bold text-[var(--Primary_5)]">
                          {formatCurrency(invoice.amount)}
                        </p>
                        <button
                          onClick={() => void handleDownload(invoice.id)}
                          disabled={downloadId === invoice.id}
                          className="px-4 py-2 rounded-md bg-[var(--Primary_5)] text-white hover:bg-[#1e4a6f] disabled:opacity-60"
                        >
                          {downloadId === invoice.id ? "Generando..." : "Descargar comprobante"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
