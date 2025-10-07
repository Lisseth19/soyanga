// src/servicios/proveedor.ts
import type { Proveedor } from "../types/proveedor";
import type { Page } from "../types/pagination";

// Usa proxy de Vite ("/api") o variable de entorno si la tienes
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? ""; // ej: "http://localhost:8080"
const BASE = `${API_BASE}/api/v1/proveedores`;

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

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status} ${res.statusText}`);
    }

    if (res.status === 204 || res.status === 205) {
        // @ts-expect-error: endpoints sin cuerpo
        return undefined;
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        return (await res.json()) as T;
    } else {
        const text = await res.text();
        if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
            throw new Error("El servidor devolvió HTML (¿ruta / proxy incorrecto?). Revisa la URL del API o el proxy de Vite.");
        }
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error("Respuesta no-JSON del servidor: " + text.slice(0, 200));
        }
    }
}

// === Servicios ===
export function listarProveedores(opts?: { q?: string; page?: number; size?: number; soloActivos?: boolean }) {
    const query = qs({
        q: opts?.q,
        page: opts?.page ?? 0,
        size: opts?.size ?? 20,
        soloActivos: opts?.soloActivos ?? false,
    });
    return fetchJson<Page<Proveedor>>(`${BASE}${query}`);
}

export function obtenerProveedor(id: number) {
    return fetchJson<Proveedor>(`${BASE}/${id}`);
}

export function crearProveedor(dto: Omit<Proveedor, "idProveedor">) {
    return fetchJson<Proveedor>(BASE, { method: "POST", body: JSON.stringify(dto) });
}

export function editarProveedor(id: number, dto: Partial<Omit<Proveedor, "idProveedor">>) {
    return fetchJson<Proveedor>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(dto) });
}

export function eliminarProveedor(id: number) {
    return fetchJson<void>(`${BASE}/${id}`, { method: "DELETE" });
}
