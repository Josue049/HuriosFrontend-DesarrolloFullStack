const LOCAL_API_URL = "http://localhost:8080";
const PRODUCTION_FALLBACK_API_URL = "https://huriosrally-backend.onrender.com";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

const envApiUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL = envApiUrl
  ? normalizeUrl(envApiUrl)
  : import.meta.env.PROD
    ? PRODUCTION_FALLBACK_API_URL
    : LOCAL_API_URL;
