// src/api/http.ts
// Cliente HTTP unificado basado en fetch con:
// - BaseURL desde Vite (.env)
// - Token Authorization (opcional)
// - Timeout con AbortController
// - Reintentos exponenciales para errores transitorios
// - Limpieza de params y JSON automático
// - Tipado genérico <T>

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const BASE_URL = import.meta.env.VITE_API_BASE ?? "/"; // <— clave

// Si usas token (Bearer) guárdalo en algún sitio (localStorage, Zustand, etc.)
function getAuthToken(): string | null {
  // Ejemplo: return localStorage.getItem("token");
  return null;
}

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
  attempts?: number;        // intentos totales (incluyendo el primero) -> por defecto 3 para GET
  baseDelayMs?: number;     // backoff inicial
  retryOn?: (e: ApiError, method: HttpMethod) => boolean;
};

type HttpOptions<B = unknown> = {
  method?: HttpMethod;
  params?: Record<string, unknown>;
  body?: B;                           // objetos se serializan a JSON automáticamente
  headers?: Record<string, string>;
  timeoutMs?: number;                 // por defecto 15s
  credentials?: RequestCredentials;   // "omit" | "same-origin" | "include"
  signal?: AbortSignal;               // para cancelación externa (useEffect cleanup)
  auth?: boolean;                     // agrega Authorization: Bearer <token>, default: true
  retry?: RetryConfig;                // reintentos (por defecto GET reintenta 3 veces en 429/502/503/504/red)
};

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRY: Required<RetryConfig> = {
  attempts: 3,
  baseDelayMs: 300,
  retryOn: (e, method) => {
    if (method !== "GET") return false; // reintentos solo en métodos idempotentes
    // 429: Too Many Requests, 502/503/504: transitorios de red/servidor
    return !!(e.isNetworkError || [429, 502, 503, 504].includes(e.status ?? 0));
  }
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  // Normaliza el path
  const p = path.startsWith("/") ? path : `/${path}`;

  let url: URL;

  if (/^https?:\/\//i.test(BASE_URL)) {
    // BASE_URL absoluta (ej. http://192.168.2.110:8084 o http://localhost:8084)
    url = new URL(p, BASE_URL);
  } else {
    // BASE_URL relativa (ej. /api para proxy de Vite)
    const base = (BASE_URL || "").replace(/\/+$/, ""); // quita barra final
    const full = `${base}${p}`;                        // -> /api + /v1/... = /api/v1/...
    url = new URL(full, window.location.origin);       // usa el origin actual como base absoluta
  }

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.append(k, String(v));
    });
  }

  return url.toString();
}


function mergeSignals(signalA?: AbortSignal, signalB?: AbortSignal): AbortSignal | undefined {
  if (!signalA) return signalB;
  if (!signalB) return signalA;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signalA.addEventListener("abort", onAbort);
  signalB.addEventListener("abort", onAbort);
  if (signalA.aborted || signalB.aborted) controller.abort();
  return controller.signal;
}

async function coreFetch<T, B = unknown>(path: string, options: HttpOptions<B> = {}): Promise<T> {
  const method: HttpMethod = (options.method ?? "GET").toUpperCase() as HttpMethod;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const authEnabled = options.auth ?? true;
  const retry = { ...DEFAULT_RETRY, ...(options.retry ?? {}) };
  const credentials = options.credentials; // define esto si usas cookies/sesión con CORS

  // Construye URL
  const url = buildUrl(path, options.params);

  console.debug('HTTP', (options.method ?? 'GET'), '→', url);

  // AbortController para timeout + soporte de cancelación externa
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = mergeSignals(timeoutController.signal, options.signal);

  // Headers
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };

  // Authorization
  if (authEnabled) {
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // Body JSON (si no es FormData/Blob/etc.)
  let body: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    if (
      typeof FormData !== "undefined" && options.body instanceof FormData ||
      typeof Blob !== "undefined" && options.body instanceof Blob
    ) {
      body = options.body as any; // fetch pone el boundary/headers automáticamente
    } else {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = JSON.stringify(options.body);
    }
  }

  // Función que realmente hace la solicitud (para reintentos)
  const attempt = async (): Promise<T> => {
    try {
      const res = await fetch(url, { method, headers, body, signal, credentials });

      // 2xx
      if (res.ok) {
        // 204 No Content
        if (res.status === 204) {
          clearTimeout(timeoutId);
          return undefined as unknown as T;
        }
        // Detecta JSON por header
        const ctype = res.headers.get("content-type") || "";
        if (ctype.includes("application/json")) {
          const json = await res.json();
          clearTimeout(timeoutId);
          return json as T;
        }
        // Si no es JSON, devuelve texto (o lo que toque)
        const text = await res.text();
        clearTimeout(timeoutId);
        return text as unknown as T;
      }

      // Error de servidor/cliente con body parseable
      let details: unknown;
      let message = `HTTP ${res.status}`;
      const ctype = res.headers.get("content-type") || "";
      try {
        if (ctype.includes("application/json")) {
          details = await res.json();
          const m = (details as any)?.message;
          if (typeof m === "string" && m.trim()) message = m;
        } else {
          const t = await res.text();
          if (t) { details = t; message = t; }
        }
      } catch {
        // sin body útil
      }
      throw new ApiError(message, { status: res.status, details });

    } catch (err: any) {
      // Abort / Timeout / Red
      if (err?.name === "AbortError") {
        throw new ApiError("La solicitud fue cancelada o agotó el tiempo de espera", { isNetworkError: true });
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError(err?.message || "Fallo de red", { isNetworkError: true });
    }
  };

  // Reintentos exponenciales para GET y errores transitorios
  let lastError: ApiError | null = null;
  for (let i = 1; i <= retry.attempts; i++) {
    try {
      const out = await attempt();
      return out;
    } catch (e) {
      const apiErr = e as ApiError;
      lastError = apiErr;
      const shouldRetry = retry.retryOn(apiErr, method) && i < retry.attempts;
      if (!shouldRetry) break;
      const backoff = retry.baseDelayMs * Math.pow(2, i - 1); // 300, 600, 1200...
      await sleep(backoff);
    }
  }

  clearTimeout(timeoutId);
  throw (lastError ?? new ApiError("Error desconocido"));
}

// Helpers de conveniencia, con tipado genérico
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
