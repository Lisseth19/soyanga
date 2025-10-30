import { http } from "@/servicios/httpClient";
import type {
    AnticipoCrearDTO,
    Anticipo,                  // <= usa la entidad para /{id}
    AnticipoListado,          // <= listado con aplicado/saldo
    AplicarAnticipoDTO,
    AplicarAnticipoRespuestaDTO,
    AnticipoReservaDTO,
    LiberarReservaAnticipoDTO,
    AnticipoReservaRespuestaDTO,
    ReservaAnticipoRespuestaDTO,
    Page,
    PageAplicacionAnticipo,
} from "@/types/anticipos";

const BASE = "/v1/anticipos";

function clean<T extends Record<string, unknown>>(obj?: T): T | undefined {
    if (!obj) return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === "") continue;
        out[k] = v;
    }
    return out as T;
}

function toIsoDateTime(d?: string, isEnd = false) {
    if (!d) return undefined;
    if (d.includes("T")) return d;
    return isEnd ? `${d}T23:59:59` : `${d}T00:00:00`;
}

export const anticiposService = {
    /** GET /api/v1/anticipos?idCliente=&desde=&hasta=&page=&size= */
    listar(params: {
        idCliente?: number;
        desde?: string; // YYYY-MM-DD o ISO
        hasta?: string; // YYYY-MM-DD o ISO
        page?: number;
        size?: number;
    }): Promise<Page<AnticipoListado>> {              // <= CAMBIO
        const q = clean({
            ...params,
            desde: toIsoDateTime(params?.desde, false),
            hasta: toIsoDateTime(params?.hasta, true),
        });
        return http.get<Page<AnticipoListado>>(BASE, { params: q });  // <= CAMBIO
    },

    /** GET /api/v1/anticipos/{id} */
    obtener(id: number): Promise<Anticipo> {          // <= CAMBIO
        return http.get<Anticipo>(`${BASE}/${id}`);     // <= CAMBIO
    },

    /** POST /api/v1/anticipos */
    crear(dto: AnticipoCrearDTO): Promise<{ idAnticipo: number }> {
        return http.post<{ idAnticipo: number }>(BASE, dto);
    },

    /** POST /api/v1/anticipos/{id}/aplicar */
    aplicar(idAnticipo: number, dto: AplicarAnticipoDTO): Promise<AplicarAnticipoRespuestaDTO> {
        return http.post<AplicarAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/aplicar`, dto);
    },

    /** (si luego agregas historial) */
    listarAplicacionesPorAnticipo(
        idAnticipo: number,
        params?: { page?: number; size?: number; desde?: string; hasta?: string }
    ): Promise<PageAplicacionAnticipo> {
        const q = clean({
            ...params,
            desde: toIsoDateTime(params?.desde, false),
            hasta: toIsoDateTime(params?.hasta, true),
        });
        return http.get<PageAplicacionAnticipo>(`${BASE}/${idAnticipo}/aplicaciones`, { params: q });
    },

    /** GET /v1/ventas/{id}/aplicaciones-anticipo */
    listarAplicacionesPorVenta(
        idVenta: number,
        params?: { page?: number; size?: number; desde?: string; hasta?: string }
    ): Promise<PageAplicacionAnticipo> {
        const q = clean({
            ...params,
            desde: toIsoDateTime(params?.desde, false),
            hasta: toIsoDateTime(params?.hasta, true),
        });
        return http.get<PageAplicacionAnticipo>(`/v1/ventas/${idVenta}/aplicaciones-anticipo`, { params: q });
    },

    // ===== Reservas =====
    reservar(idAnticipo: number, dto: AnticipoReservaDTO): Promise<AnticipoReservaRespuestaDTO> {
        return http.post<AnticipoReservaRespuestaDTO>(`${BASE}/${idAnticipo}/reservas`, dto);
    },
    liberarReserva(idAnticipo: number, dto: LiberarReservaAnticipoDTO): Promise<ReservaAnticipoRespuestaDTO> {
        return http.post<ReservaAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/reservas/liberar`, dto);
    },
    liberarTodasLasReservas(idAnticipo: number): Promise<{ ok: boolean; [k: string]: any }> {
        return http.post(`${BASE}/${idAnticipo}/reservas/liberar-todo`);
    },
};
