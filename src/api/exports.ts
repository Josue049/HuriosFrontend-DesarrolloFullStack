import { API_BASE_URL } from "../config/api";
import { getToken, handleUnauthorizedResponse } from "../utils/token";

const API_BASE = API_BASE_URL;

export type ExportType = "clients" | "products" | "sales";

const EXPORT_PATHS: Record<ExportType, string> = {
  clients: "/export/clients",
  products: "/export/products",
  sales: "/export/sales",
};

function getFilenameFromDisposition(
  contentDisposition: string | null,
  fallbackName: string,
) {
  if (!contentDisposition) {
    return fallbackName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallbackName;
}

export async function downloadExportReport(type: ExportType): Promise<string> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${EXPORT_PATHS[type]}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 401 || response.status === 403) {
    handleUnauthorizedResponse();
  }

  if (!response.ok) {
    throw new Error("No se pudo exportar el reporte solicitado");
  }

  const blob = await response.blob();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fallbackName = `Reporte-${type}-${timestamp}.xlsx`;
  const fileName = getFilenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackName,
  );

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return fileName;
}
