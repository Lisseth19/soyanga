// src/api/httpClient.ts
// Cliente HTTP con:
// - BASE_URL desde Vite (VITE_API_BASE) → /api por defecto (proxy)
// - Bearer automático (salvo login/refresh y público GET)
// - Auto-refresh en 401 (una sola vez)
// - Timeout + reintentos en GET transitorios
// - Limpieza de params y JSON automático
// - Watcher de expiración del JWT + eventos (expiring / expired / refreshed)

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthEventName = "auth:expiring" | "auth:expired" | "auth:refreshed";

const BASE_URL = import.meta.env.VITE_API_BASE ?? "/api";

/* ====================== Session helpers (localStorage) ====================== */
export function getAccessToken(): string | null { return localStorage.getItem("accessToken"); }
export function getRefreshToken(): string | null { return localStorage.getItem("refreshToken"); }

/* ===== Watcher de expiración ===== */
const EXPIRY_LEAD_MS = 2 * 60 * 1000; // avisa 2 minutos antes de expirar
let expiringTimer: number | null = null;
let expiredTimer: number | null = null;

function notifyAuthEvent(name: AuthEventName, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onAuth(event: AuthEventName, handler: (ev: CustomEvent) => void): () => void {
  const wrapped = handler as EventListener;
  window.addEventListener(event, wrapped);
  return () => window.removeEventListener(event, wrapped);
}

function decodeJwtPayload(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return null; }
}

function getAccessExpMs(token?: string | null): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const expSec = payload?.exp;
  if (!expSec || typeof expSec !== "number") return null;
  return expSec * 1000;
}

export function stopTokenWatch() {
  if (expiringTimer) { window.clearTimeout(expiringTimer); expiringTimer = null; }
  if (expiredTimer)  { window.clearTimeout(expiredTimer);  expiredTimer = null; }
}

export function startTokenWatch(token?: string | null) {
  stopTokenWatch();
  const t = token ?? getAccessToken();
  const expMs = getAccessExpMs(t);
  if (!expMs) return;

  const now = Date.now();
  const msToExp = expMs - now;
  if (msToExp <= 0) { notifyAuthEvent("auth:expired"); return; }

  const msToWarn = Math.max(msToExp - EXPIRY_LEAD_MS, 0);

  expiringTimer = window.setTimeout(() => {
    const remain = Math.max(expMs - Date.now(), 0);
    notifyAuthEvent("auth:expiring", { remainingMs: remain });
  }, msToWarn);

  expiredTimer = window.setTimeout(() => {
    notifyAuthEvent("auth:expired");
  }, msToExp);
}

/* ===== Guardado/Limpieza de tokens (con watcher) ===== */
export function saveTokens(tokens: { accessToken?: string; refreshToken?: string | null }) {
  if (tokens.accessToken) {
    localStorage.setItem("accessToken", tokens.accessToken);
    startTokenWatch(tokens.accessToken);
  }
  if (tokens.refreshToken != null) localStorage.setItem("refreshToken", tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  stopTokenWatch();
}

/* ======================= Errors & Types ======================= */
export class ApiError extends Error {
  status?: number;
  details?: unknown;
  isNetworkError?: boolean;
  constructor(message: string, opts?: { status?: number; details?: unknown; isNetworkError?: boolean }) {
    super(message);
    this.name = "ApiError";
    this.status = opts?.status;
    this.details = opts?.details;
    this.isNetworkError = opts?.isNetworkError;
  }
}

type RetryConfig = {
  attempts?: number;
  baseDelayMs?: number;
  retryOn?: (e: ApiError, method: HttpMethod) => boolean;
};

type HttpOptions<B = unknown> = {
  method?: HttpMethod;
  params?: Record<string, unknown>;
  body?: B;
  headers?: Record<string, string>;
  timeoutMs?: number;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  auth?: boolean; // default true
  retry?: RetryConfig;
};

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRY: Required<RetryConfig> = {
  attempts: 3,
  baseDelayMs: 300,
  retryOn: (e, method) => method === "GET" && !!(e.isNetworkError || [429, 502, 503, 504].includes(e.status ?? 0)),
};

/* ======================= Utils ======================= */
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  let url: URL;
  if (/^https?:\/\//i.test(BASE_URL)) {
    url = new URL(p, BASE_URL);
  } else {
    const base = (BASE_URL || "").replace(/\/+$/, "");
    const full = `${base}${p}`;
    url = new URL(full, window.location.origin);
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }
  }
  return url.toString();
}

function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  const c = new AbortController();
  const abort = () => c.abort();
  a.addEventListener("abort", abort);
  b.addEventListener("abort", abort);
  if (a.aborted || b.aborted) c.abort();
  return c.signal;
}

// Evitar auth en estos paths (aunque pase {auth:true})
const NO_AUTH_REGEX = /\/v1\/auth\/(login|refresh)(\/)?$/;
// GET público (catálogo)
const PUBLIC_GET_REGEX = /^\/v1\/catalogo\/publico\/.*/;

/* =============== Refresh control (una sola vez) =============== */
let refreshPromise: Promise<boolean> | null = null;

async function doRefreshOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
      const url = buildUrl("/v1/auth/refresh");
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(rt),
      });

      if (!res.ok) {
        clearTokens();
        return false;
      }

      const ctype = res.headers.get("content-type") || "";
      const data = ctype.includes("application/json") ? await res.json() : await res.text();

      const accessToken = (data as any)?.accessToken;
      const refreshToken = (data as any)?.refreshToken ?? null;
      if (!accessToken) { clearTokens(); return false; }

      saveTokens({ accessToken, refreshToken });
      notifyAuthEvent("auth:refreshed");
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* ======================= Core Fetch ======================= */
async function coreFetch<T, B = unknown>(path: string, options: HttpOptions<B> = {}): Promise<T> {
  const method: HttpMethod = (options.method ?? "GET").toUpperCase() as HttpMethod;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const retry = { ...DEFAULT_RETRY, ...(options.retry ?? {}) };
  const credentials = options.credentials;

  // auth: true por defecto
  const authWanted = options.auth ?? true;

  // Desactiva auth para login/refresh y para GET público de catálogo
  const withoutAuthForLogin = NO_AUTH_REGEX.test(path);
  const withoutAuthForPublicGet = method === "GET" && PUBLIC_GET_REGEX.test(path);
  const authEnabled = authWanted && !withoutAuthForLogin && !withoutAuthForPublicGet;

  const url = buildUrl(path, options.params);

  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const signal = mergeSignals(timeoutCtrl.signal, options.signal);

  // guardar body original para reintentos
  const payload = options.body;

  const attempt = async (): Promise<T> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    if (authEnabled) {
      const token = getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let body: BodyInit | undefined;
    if (payload !== undefined && payload !== null) {
      if (
          (typeof FormData !== "undefined" && payload instanceof FormData) ||
          (typeof Blob !== "undefined" && payload instanceof Blob)
      ) {
        body = payload as any;
      } else {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(payload);
      }
    }

    try {
      const res = await fetch(url, { method, headers, body, signal, credentials });

      if (res.ok) {
        if (res.status === 204) { clearTimeout(timeoutId); return undefined as unknown as T; }
        const ctype = res.headers.get("content-type") || "";
        if (ctype.includes("application/json")) {
          const json = await res.json();
          clearTimeout(timeoutId);
          return json as T;
        } else {
          const text = await res.text();
          clearTimeout(timeoutId);
          return text as unknown as T;
        }
      }

      // Error HTTP
      let details: unknown;
      let message = `HTTP ${res.status}`;
      try {
        const ctype = res.headers.get("content-type") || "";
        if (ctype.includes("application/json")) {
          details = await res.json();
          const m = (details as any)?.message;
          if (typeof m === "string" && m.trim()) message = m;
        } else {
          const t = await res.text();
          if (t) { details = t; message = t; }
        }
      } catch { /* ignore */ }

      throw new ApiError(message, { status: res.status, details });

    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new ApiError("La solicitud fue cancelada o agotó el tiempo de espera", { isNetworkError: true });
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError(err?.message || "Fallo de red", { isNetworkError: true });
    }
  };

  let lastError: ApiError | null = null;
  let triedRefresh = false;

  for (let i = 1; i <= retry.attempts; i++) {
    try {
      const out = await attempt();
      return out;
    } catch (e) {
      const apiErr = e as ApiError;
      lastError = apiErr;

      // 401 ⇒ intenta refresh una sola vez (si authEnabled y no es /auth/login|refresh)
      if (authEnabled && apiErr.status === 401 && !triedRefresh) {
        triedRefresh = true;
        const ok = await doRefreshOnce();
        if (ok) { i--; continue; }
        clearTokens();
        notifyAuthEvent("auth:expired");
        break;
      }

      // Reintentos transitorios en GET
      const shouldRetry = retry.retryOn(apiErr, method) && i < retry.attempts;
      if (!shouldRetry) break;
      const backoff = retry.baseDelayMs * Math.pow(2, i - 1); // 300, 600, 1200...
      await sleep(backoff);
    }
  }

  clearTimeout(timeoutId);
  throw (lastError ?? new ApiError("Error desconocido"));
}

/* ======================= API HTTP ======================= */
export const http = {
  get: <T>(path: string, opts: Omit<HttpOptions, "method" | "body"> = {}) =>
      coreFetch<T>(path, { ...opts, method: "GET" }),

  post: <T, B = unknown>(path: string, body?: B, opts: Omit<HttpOptions<B>, "method"> = {}) =>
      coreFetch<T, B>(path, { ...opts, method: "POST", body }),

  put:  <T, B = unknown>(path: string, body?: B, opts: Omit<HttpOptions<B>, "method"> = {}) =>
      coreFetch<T, B>(path, { ...opts, method: "PUT", body }),

  patch:<T, B = unknown>(path: string, body?: B, opts: Omit<HttpOptions<B>, "method"> = {}) =>
      coreFetch<T, B>(path, { ...opts, method: "PATCH", body }),

  del:  <T>(path: string, opts: Omit<HttpOptions, "method" | "body"> = {}) =>
      coreFetch<T>(path, { ...opts, method: "DELETE" }),
};

/* ===== Cliente público (forzado sin auth) ===== */
export const httpPublic = {
  get:   <T>(path: string, opts: Omit<HttpOptions, "method" | "body"> = {}) =>
      coreFetch<T>(path, { ...opts, method: "GET",   auth: false }),
  post:  <T, B = unknown>(path: string, body?: B, opts: Omit<HttpOptions<B>, "method"> = {}) =>
      coreFetch<T, B>(path, { ...opts, method: "POST", auth: false, body }),
  put:   <T, B = unknown>(path: string, body?: B, opts: Omit<HttpOptions<B>, "method"> = {}) =>
      coreFetch<T, B>(path, { ...opts, method: "PUT",  auth: false, body }),
  patch: <T, B = unknown>(path: string, body?: B, opts: Omit<HttpOptions<B>, "method"> = {}) =>
      coreFetch<T, B>(path, { ...opts, method: "PATCH",auth: false, body }),
  del:   <T>(path: string, opts: Omit<HttpOptions, "method" | "body"> = {}) =>
      coreFetch<T>(path, { ...opts, method: "DELETE", auth: false }),
};
