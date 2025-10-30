// src/servicios/ventas.ts
import { http } from "@/servicios/httpClient";
import type {
    Page,
    VentaListado,
    VentaCrearDTO,
    VentaCrearRespuesta,
    VentaDetalleRespuestaDTO,
    VentaTrazabilidadDTO,
    DespachoVentaResp,
    AnulacionVentaResp,
    VentaEstado,
} from "@/types/ventas";

export type ListVentasParams = {
    estado?: "" | VentaEstado;
    clienteId?: number;      // ← el backend original filtra por ID
    desde?: string;          // YYYY-MM-DD o ISO
    hasta?: string;          // YYYY-MM-DD o ISO
    page?: number;
    size?: number;
};

function toIsoDateTime(d?: string, isEnd = false) {
    if (!d) return undefined;
    if (d.includes("T")) return d;
    return isEnd ? `${d}T23:59:59` : `${d}T00:00:00`;
}

function clean<T extends Record<string, unknown>>(obj: T): T {
    const out: Record<string, unknown> = {};
    Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        out[k] = v;
    });
    return out as T;
}

const BASE = "/v1/ventas";

export const ventasService = {
    listar(params: ListVentasParams): Promise<Page<VentaListado>> {
        const q = clean({
            estado: params.estado,
            clienteId: params.clienteId,
            desde: toIsoDateTime(params.desde, false),
            hasta: toIsoDateTime(params.hasta, true),
            page: params.page ?? 0,
            size: params.size ?? 20,
        });
        return http.get<Page<VentaListado>>(BASE, { params: q });
    },

    detalle(id: number): Promise<VentaDetalleRespuestaDTO> {
        return http.get<VentaDetalleRespuestaDTO>(`${BASE}/${id}`);
    },

    trazabilidad(id: number): Promise<VentaTrazabilidadDTO> {
        return http.get<VentaTrazabilidadDTO>(`${BASE}/${id}/trazabilidad`);
    },

    crear(dto: VentaCrearDTO): Promise<VentaCrearRespuesta> {
        return http.post<VentaCrearRespuesta>(BASE, dto);
    },

    despachar(id: number): Promise<DespachoVentaResp> {
        return http.post<DespachoVentaResp>(`${BASE}/${id}/despachar`);
    },

    anular(id: number, motivo?: string): Promise<AnulacionVentaResp> {
        const params = motivo ? { motivo } : {};
        return http.post<AnulacionVentaResp>(`${BASE}/${id}/anular`, undefined, { params });
    },
};
