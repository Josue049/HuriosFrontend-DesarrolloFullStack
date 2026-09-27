import { API_BASE_URL } from "../config/api";
import { ApiError } from "./errors";

export { ApiError, getApiErrorMessage, isApiError } from "./errors";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const buildUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
};

const serializeBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
};

const isJsonBody = (body: unknown): boolean =>
  body !== undefined &&
  body !== null &&
  typeof body !== "string" &&
  !(body instanceof FormData) &&
  !(body instanceof URLSearchParams) &&
  !(body instanceof Blob) &&
  !(body instanceof ArrayBuffer);

const parseJsonText = (text: string, response: Response): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("El servidor devolvió una respuesta inválida.", {
      kind: "invalid-response",
      status: response.status,
      details: text,
    });
  }
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text.trim()) {
    return undefined;
  }

  return parseJsonText(text, response);
};

const getBackendErrorMessage = (details: unknown): string | undefined => {
  if (typeof details === "string" && details.trim()) {
    return details;
  }

  if (typeof details !== "object" || details === null) {
    return undefined;
  }

  const data = details as Record<string, unknown>;
  const candidate = data.message ?? data.error ?? data.detail;

  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...requestInit } = options;
  const serializedBody = serializeBody(body);
  const requestHeaders = new Headers(headers);
  let response: Response;

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (isJsonBody(body) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  try {
    response = await fetch(buildUrl(path), {
      ...requestInit,
      headers: requestHeaders,
      body: serializedBody,
    });
  } catch (error) {
    throw new ApiError("No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.", {
      kind: "network",
      details: error,
    });
  }

  if (!response.ok) {
    let details: unknown;

    try {
      details = await readResponseBody(response);
    } catch (error) {
      if (error instanceof ApiError) {
        details = error.details;
      } else {
        details = undefined;
      }
    }

    const backendMessage = getBackendErrorMessage(details);

    throw new ApiError(
      backendMessage ?? `La petición al servidor falló con estado ${response.status}.`,
      {
        kind: "http",
        status: response.status,
        details,
      },
    );
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const data = await readResponseBody(response);

  if (data === undefined) {
    throw new ApiError("El servidor respondió sin datos cuando se esperaba una respuesta JSON.", {
      kind: "invalid-response",
      status: response.status,
    });
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
    return apiRequest<T>(path, { ...options, method: "GET" });
  },

  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: Omit<ApiRequestOptions, "method" | "body"> = {},
  ) {
    return apiRequest<TResponse>(path, { ...options, method: "POST", body });
  },
};
