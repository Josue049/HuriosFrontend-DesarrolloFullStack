import { clearCurrentEmail } from "../api/localStorageDb";

const TOKEN_KEY = "hurios_token";
const ROLE_KEY = "hurios_role";
const AUTH_MESSAGE_KEY = "hurios_auth_message";
const DEFAULT_EXPIRED_MESSAGE = "Tu sesion expiro. Inicia sesion de nuevo.";

export function saveToken(token: string) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function clearToken() {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    clearCurrentEmail();
  }
}

export function saveRole(role: string) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(ROLE_KEY, role);
  }
}

export function getRole(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem(ROLE_KEY);
  }
  return null;
}

export function redirectToLoginForExpiredSession(
  message: string = DEFAULT_EXPIRED_MESSAGE,
) {
  if (typeof window === "undefined") {
    return;
  }

  clearToken();
  window.sessionStorage?.setItem(AUTH_MESSAGE_KEY, message);

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export function consumeAuthMessage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const message = window.sessionStorage?.getItem(AUTH_MESSAGE_KEY) || null;

  if (message) {
    window.sessionStorage?.removeItem(AUTH_MESSAGE_KEY);
  }

  return message;
}

export function handleUnauthorizedResponse(
  message: string = DEFAULT_EXPIRED_MESSAGE,
): never {
  redirectToLoginForExpiredSession(message);
  throw new Error(message);
}
