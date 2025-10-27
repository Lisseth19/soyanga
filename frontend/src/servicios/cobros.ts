import { http } from "@/servicios/httpClient";
import type {
    CxcItem,
    PagoCrearDTO, PagoRespuestaDTO,
    PagoAplicarDTO, PagoAplicarRespuestaDTO,
    Page,
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

function toIsoDateTime(d?: string, isEnd = false) {
    if (!d) return undefined;
    if (d.includes("T")) return d;
    return isEnd ? `${d}T23:59:59` : `${d}T00:00:00`;
}

export const cobrosService = {
    /** GET /v1/cobros/cxc */
    listarCxc(params: {
        soloAbiertas?: boolean;
        clienteId?: number;
        emisionDesde?: string; // YYYY-MM-DD o ISO
        emisionHasta?: string; // YYYY-MM-DD o ISO
        venceAntes?: string;   // YYYY-MM-DD o ISO
        page?: number;
        size?: number;
    }): Promise<Page<CxcItem>> {
        const q = clean({
            ...params,
            emisionDesde: toIsoDateTime(params?.emisionDesde, false),
            emisionHasta: toIsoDateTime(params?.emisionHasta, true),
            venceAntes: toIsoDateTime(params?.venceAntes, true),
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

    /** POST /v1/cobros/pagos */
    crearPago(dto: PagoCrearDTO): Promise<PagoRespuestaDTO> {
        return http.post<PagoRespuestaDTO>(`${BASE}/pagos`, dto);
    },

    /** POST /v1/cobros/pagos/{id}/aplicar */
    aplicarPago(idPago: number, dto: PagoAplicarDTO): Promise<PagoAplicarRespuestaDTO> {
        return http.post<PagoAplicarRespuestaDTO>(`${BASE}/pagos/${idPago}/aplicar`, dto);
    },
};
