import { API_BASE_URL } from "../config/api";
import { getToken, handleUnauthorizedResponse } from "../utils/token";

const API_BASE = API_BASE_URL;

export interface PaymentSaleItem {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: {
    id: number;
    name?: string;
    imageUrl?: string;
  };
}

export interface PaymentSale {
  id: number;
  fullName: string;
  phone: string;
  documentType: string;
  dni?: string;
  companyName?: string;
  ruc?: string;
  companyAddress?: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  deliveryDistrict?: string;
  deliveryReference?: string;
  paymentMethod: string;
  paymentDetails?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items?: PaymentSaleItem[];
  user?: {
    id: number;
    email?: string;
    fullName?: string;
  };
}

export interface CheckoutPreferenceResponse {
  success: boolean;
  saleId: number;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  transactionId?: string;
  message: string;
}

export interface PaymentVerificationResponse {
  approved: boolean;
  saleId: number;
  status: string;
  mpPaymentId?: string;
  paymentMethod?: string;
  total: number;
  transactionId?: string;
  message: string;
}

function requireToken() {
  const token = getToken();
  if (!token) {
    throw new Error("No hay sesion activa");
  }
  return token;
}

function asNetworkError(error: unknown): never {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    throw new Error(
      "No se puede conectar con el servidor. Verifica que el backend este corriendo.",
    );
  }
  throw error;
}

async function fetchWithAuth<T>(path: string): Promise<T> {
  const token = requireToken();

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorizedResponse();
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || "Error al obtener datos de pagos");
    }

    return await res.json();
  } catch (error) {
    asNetworkError(error);
  }
}

export async function createMercadoPagoCheckout(payload: Record<string, unknown>): Promise<CheckoutPreferenceResponse> {
  const token = requireToken();

  try {
    const res = await fetch(`${API_BASE}/payments/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorizedResponse();
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || "Error al iniciar pago con MercadoPago");
    }

    return await res.json();
  } catch (error) {
    asNetworkError(error);
  }
}

export async function verifyMercadoPagoPayment(queryString: string): Promise<PaymentVerificationResponse> {
  return fetchWithAuth<PaymentVerificationResponse>(`/payments/verify?${queryString}`);
}

export async function getMyOrders(): Promise<PaymentSale[]> {
  return fetchWithAuth<PaymentSale[]>("/payments/my-orders");
}

export async function getAllSales(): Promise<PaymentSale[]> {
  return fetchWithAuth<PaymentSale[]>("/payments/all");
}

export async function getSaleById(id: number): Promise<PaymentSale> {
  return fetchWithAuth<PaymentSale>(`/payments/${id}`);
}
