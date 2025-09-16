import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type { Moneda, MonedaCrear, MonedaActualizar } from "@/types/moneda";

// Path real del backend
const BASE = "/v1/catalogo/monedas";

/** Forma que DEVUELVE el backend (MonedaDTO) */
type MonedaAPI = {
    id: number;
    codigo: string;
    nombre: string;
    esLocal: boolean;
    estadoActivo: boolean;
    tasaCambioRespectoLocal?: number | null;
};

/** API -> UI */
const fromApi = (m: MonedaAPI): Moneda => ({
    idMoneda: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    esLocal: m.esLocal,
    estadoActivo: m.estadoActivo,
    tasaCambioRespectoLocal: m.tasaCambioRespectoLocal ?? null,
});

/** UI -> API (crear) — el backend espera codigo/nombre/esLocal */
const toCreate = (m: MonedaCrear) => ({
    codigo: m.codigo ?? "",
    nombre: m.nombre ?? "",
    esLocal: !!m.esLocal,
    // solo manda la tasa si NO es local
    ...(m.esLocal ? {} : (m.tasaCambioRespectoLocal != null ? { tasaCambioRespectoLocal: m.tasaCambioRespectoLocal } : {})),
});

/** UI -> API (editar) */
const toUpdate = (m: MonedaActualizar) => ({
    codigo: m.codigo,    // obligatorio para actualizar en tu servicio
    nombre: m.nombre,    // obligatorio
    esLocal: m.esLocal,
    estadoActivo: m.estadoActivo,
    ...(m.esLocal === true
        ? { tasaCambioRespectoLocal: null }
        : m.tasaCambioRespectoLocal === undefined
            ? {}
            : { tasaCambioRespectoLocal: m.tasaCambioRespectoLocal }),
});

function clean<T extends Record<string, unknown>>(params: T): T {
    const out: Record<string, unknown> = { ...params };
    Object.keys(out).forEach((k) => {
        const v = out[k];
        if (v === undefined || v === null || v === "") delete out[k];
    });
    return out as T;
}

export const monedaService = {
    // El backend espera q, activos, page, size, sort (por campos de entidad: nombreMoneda, codigoMoneda…)
    async list(params: { q?: string; activos?: boolean; page?: number; size?: number; sort?: string; }): Promise<Page<Moneda>> {
        const { q, activos, page, size, sort } = params || {};
        const res = await http.get<Page<MonedaAPI>>(BASE, {
            params: clean({ q, activos, page, size, sort }),
        });
        return { ...res, content: res.content.map(fromApi) };
    },

    get: (id: number) => http.get<MonedaAPI>(`${BASE}/${id}`).then(fromApi),

    create: (dto: MonedaCrear) =>
        http.post<MonedaAPI, any>(BASE, toCreate(dto)).then(fromApi),

    update: (id: number, dto: MonedaActualizar) =>
        http.put<MonedaAPI, any>(`${BASE}/${id}`, toUpdate(dto)).then(fromApi),

    // 👇 OJO: este endpoint recibe ?activo= como QUERY PARAM (no body)
    toggleActivo: (id: number, activo: boolean) =>
        http.patch<MonedaAPI>(`${BASE}/${id}/estado`, undefined, { params: { activo } }).then(fromApi),

    remove: (id: number) => http.del<void>(`${BASE}/${id}`),
};
