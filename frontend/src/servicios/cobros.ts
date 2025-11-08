// src/servicios/cobros.ts
import { http } from "@/servicios/httpClient";
import type {
    CxcItem,
    PagoCrearDTO, PagoRespuestaDTO,
    PagoAplicarDTO, PagoAplicarRespuestaDTO,
    Page,
    CxcDetalleDTO,
} from "@/types/cobros";

const BASE = "/v1/cobros";

function clean<T extends Record<string, unknown>>(obj?: T): T | undefined {
    if (!obj) return obj;
    const out: Record<string, unknown> = {};
    Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        out[k] = v;
    });
    return out as T;
}

// ⬇️ El backend espera LocalDate. Enviamos SOLO "YYYY-MM-DD".
function onlyDate(s?: string) {
    if (!s) return undefined;
    const i = s.indexOf("T");
    return i > 0 ? s.slice(0, i) : s;
}

export const cobrosService = {
    /** GET /v1/cobros/cxc */
    listarCxc(params: {
        soloAbiertas?: boolean;
        clienteId?: number;
        emisionDesde?: string; // YYYY-MM-DD
        emisionHasta?: string; // YYYY-MM-DD
        venceAntes?: string;   // YYYY-MM-DD
        page?: number;
        size?: number;
    }): Promise<Page<CxcItem>> {
        const q = clean({
            ...params,
            emisionDesde: onlyDate(params?.emisionDesde),
            emisionHasta: onlyDate(params?.emisionHasta),
            venceAntes:   onlyDate(params?.venceAntes),
        });
        return http.get<Page<CxcItem>>(`${BASE}/cxc`, { params: q });
    },

    /** GET /v1/cobros/cxc-por-venta?ventaId=...  (puede retornar 204) */
    obtenerCxcPorVenta(ventaId: number): Promise<CxcItem | null> {
        return http
            .get<CxcItem>(`${BASE}/cxc-por-venta`, { params: { ventaId } } as any)
            .catch((e: any) => {
                if (e?.response?.status === 204) return null;
                throw e;
            });
    },

    /** GET /v1/cobros/cxc/{id}/detalle */
    obtenerCxcDetalle(idCxc: number): Promise<CxcDetalleDTO> {
        return http.get<CxcDetalleDTO>(`${BASE}/cxc/${idCxc}/detalle`);
    },

    /** GET /v1/cobros/cxc/detalle-por-venta?ventaId=...  (puede retornar 204) */
    obtenerCxcDetallePorVenta(ventaId: number): Promise<CxcDetalleDTO | null> {
        return http
            .get<CxcDetalleDTO>(`${BASE}/cxc/detalle-por-venta`, { params: { ventaId } } as any)
            .catch((e: any) => {
                if (e?.response?.status === 204) return null;
                throw e;
            });
    },

    /** POST /v1/cobros/pagos */
    crearPago(dto: PagoCrearDTO): Promise<PagoRespuestaDTO> {
        return http.post<PagoRespuestaDTO>(`${BASE}/pagos`, dto);
    },

    /** POST /v1/cobros/pagos/{id}/aplicar */
    aplicarPago(idPago: number, dto: PagoAplicarDTO): Promise<PagoAplicarRespuestaDTO> {
        return http.post<PagoAplicarRespuestaDTO>(`${BASE}/pagos/${idPago}/aplicar`, dto);
    },
};
