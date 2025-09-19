import type { Cliente } from "../types/cliente";
import type { Page } from "../types/pagination";

// Usa proxy de Vite ("/api") o variable de entorno si la tienes
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? ""; // ej: "http://localhost:8080"
const BASE = `${API_BASE}/api/v1/clientes`;

function qs(params: Record<string, unknown>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : "";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });

    // Si la respuesta no es OK, intenta leer texto para mostrar mensaje útil
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status} ${res.statusText}`);
    }

    // 204/205 o sin cuerpo
    if (res.status === 204 || res.status === 205) {
        // @ts-expect-error: intencional para endpoints sin cuerpo
        return undefined;
    }

    // Solo parsea JSON si el content-type lo indica
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        return (await res.json()) as T;
    } else {
        const text = await res.text();
        // Si vino HTML, probablemente pegaste al index.html del frontend (proxy/URL mal)
        if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
            throw new Error(
                "El servidor devolvió HTML (¿ruta / proxy incorrecto?). Revisa la URL del API o el proxy de Vite."
            );
        }
        // Si no es HTML, intenta parsear como JSON por si el servidor no setea bien el header
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error("Respuesta no-JSON del servidor: " + text.slice(0, 200));
        }
    }
}

export function listarClientes(opts?: { q?: string; page?: number; size?: number; soloActivos?: boolean }) {
    const query = qs({
        q: opts?.q,
        page: opts?.page ?? 0,
        size: opts?.size ?? 20,
        soloActivos: opts?.soloActivos ?? false,
    });
    return fetchJson<Page<Cliente>>(`${BASE}${query}`);
}

export function obtenerCliente(id: number) {
    return fetchJson<Cliente>(`${BASE}/${id}`);
}

export function crearCliente(dto: Omit<Cliente, "idCliente">) {
    return fetchJson<Cliente>(BASE, { method: "POST", body: JSON.stringify(dto) });
}

// Algunos backends devuelven 204 en PUT/DELETE; el parser anterior ya lo tolera
export function editarCliente(id: number, dto: Partial<Omit<Cliente, "idCliente">>) {
    return fetchJson<Cliente>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(dto) });
}

export function eliminarCliente(id: number) {
    return fetchJson<void>(`${BASE}/${id}`, { method: "DELETE" });
}
