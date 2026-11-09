const TOKEN_KEY = "hurios_token";
const ROLE_KEY = "hurios_role";
const AUTH_MESSAGE_KEY = "hurios_auth_message";
const DEFAULT_EXPIRED_MESSAGE = "Tu sesion expiro. Inicia sesion de nuevo.";

/**
 * Usa sessionStorage por pestaña para permitir abrir varias pestañas simultáneas
 * con diferentes cuentas (ej. Pestaña 1: Administrador, Pestaña 2: Cliente)
 * en el mismo navegador durante las pruebas en tiempo real, manteniendo la sesión
 * activa al recargar (F5) cada pestaña.
 */
export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage?.setItem(TOKEN_KEY, token);
    window.localStorage?.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("hurios-auth-change"));
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    const sessionToken = window.sessionStorage?.getItem(TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }
    // Migrar token previo de localStorage solo una vez a esta pestaña y limpiarlo de localStorage
    const legacyLocalToken = window.localStorage?.getItem(TOKEN_KEY);
    if (legacyLocalToken) {
      window.sessionStorage?.setItem(TOKEN_KEY, legacyLocalToken);
      window.localStorage?.removeItem(TOKEN_KEY);
      return legacyLocalToken;
    }
  }
  return null;
}

export function clearToken() {
  if (typeof window !== "undefined") {
    window.sessionStorage?.removeItem(TOKEN_KEY);
    window.sessionStorage?.removeItem(ROLE_KEY);
    window.localStorage?.removeItem(TOKEN_KEY);
    window.localStorage?.removeItem(ROLE_KEY);
    window.dispatchEvent(new Event("hurios-auth-change"));
  }
}

export function saveRole(role: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage?.setItem(ROLE_KEY, role);
    window.localStorage?.removeItem(ROLE_KEY);
  }
}

export function getRole(): string | null {
  if (typeof window !== "undefined") {
    const sessionRole = window.sessionStorage?.getItem(ROLE_KEY);
    if (sessionRole) {
      return sessionRole;
    }
    const legacyLocalRole = window.localStorage?.getItem(ROLE_KEY);
    if (legacyLocalRole) {
      window.sessionStorage?.setItem(ROLE_KEY, legacyLocalRole);
      window.localStorage?.removeItem(ROLE_KEY);
      return legacyLocalRole;
    }
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
