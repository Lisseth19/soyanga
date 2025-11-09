// src/servicios/anticipos.ts
import { http } from "@/servicios/httpClient";
import type {
    // Core
    AnticipoCrearDTO,
    Anticipo,
    AnticipoListado,
    AplicarAnticipoDTO,
    AplicarAnticipoRespuestaDTO,
    // Paginación
    Page,
    PageAplicacionAnticipo,
    // Reservas
    AnticipoReservaDTO, // LEGACY request (idAlmacen arriba)
    ReservaAnticipoDTO, // Request oficial backend
    LiberarReservaAnticipoDTO,
    ReservaAnticipoRespuestaDTO,
    // Conversión a venta
    ConvertirContadoDTO,
    ConvertirCreditoDTO,
    AnticipoConversionResultadoDTO,
    ConvertirEnVentaReq, ConvertirEnVentaResp,
} from "@/types/anticipos";

// Si tu httpClient ya tiene baseURL "/api", este BASE debe ser "/v1/anticipos".
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

// Acepta LEGACY (idAlmacen arriba) y lo transforma al formato oficial
function toReservaPayload(dto: AnticipoReservaDTO | ReservaAnticipoDTO): ReservaAnticipoDTO {
    const asLegacy = dto as AnticipoReservaDTO;
    if (typeof (asLegacy as any).idAlmacen === "number") {
        return {
            items: asLegacy.items.map((it) => ({
                idPresentacion: it.idPresentacion,
                idAlmacen: asLegacy.idAlmacen,
                cantidad: it.cantidad,
            })),
        };
    }
    return dto as ReservaAnticipoDTO;
}

export const anticiposService = {
    listar(params: {
        idCliente?: number;
        desde?: string; // YYYY-MM-DD o ISO
        hasta?: string; // YYYY-MM-DD o ISO
        page?: number;
        size?: number;
    }): Promise<Page<AnticipoListado>> {
        const q = clean({
            ...params,
            desde: toIsoDateTime(params?.desde, false),
            hasta: toIsoDateTime(params?.hasta, true),
        });
        return http.get<Page<AnticipoListado>>(BASE, { params: q });
    },

    /** GET /api/v1/anticipos/{id} */
    obtener(id: number): Promise<Anticipo> {
        return http.get<Anticipo>(`${BASE}/${id}`);
    },

    // === NUEVO: consumir reservas y aplicar anticipo en una venta existente ===
    convertirEnVenta(idAnticipo: number, req: ConvertirEnVentaReq) {
        return http.post<ConvertirEnVentaResp>(`${BASE}/${idAnticipo}/convertir-en-venta`, req);
    },

    /** POST /api/v1/anticipos */
    crear(dto: AnticipoCrearDTO): Promise<{ idAnticipo: number }> {
        // el backend devuelve +campos (estado, fecha, etc). Tipamos lo mínimo necesario:
        return http.post<{ idAnticipo: number }>(BASE, dto);
    },

    /** POST /api/v1/anticipos/{id}/aplicar */
    aplicar(idAnticipo: number, dto: AplicarAnticipoDTO): Promise<AplicarAnticipoRespuestaDTO> {
        return http.post<AplicarAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/aplicar`, dto);
    },

    /** GET /api/v1/anticipos/{id}/aplicaciones */
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

    // ===== Reservas (STOCK) =====

    /** POST /api/v1/anticipos/{id}/reservas  (acepta permitirSinStock=true) */
    reservar(
        idAnticipo: number,
        dto: AnticipoReservaDTO | ReservaAnticipoDTO,
        opts?: { permitirSinStock?: boolean }
    ): Promise<ReservaAnticipoRespuestaDTO> {
        const payload = toReservaPayload(dto);
        const params = opts?.permitirSinStock ? { permitirSinStock: true } : undefined;
        return http.post<ReservaAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/reservas`, payload, { params });
    },

    /** POST /api/v1/anticipos/{id}/reservas/liberar */
    liberarReserva(
        idAnticipo: number,
        dto: LiberarReservaAnticipoDTO
    ): Promise<ReservaAnticipoRespuestaDTO> {
        return http.post<ReservaAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/reservas/liberar`, dto);
    },

    /** POST /api/v1/anticipos/{id}/reservas/liberar-todo */
    liberarTodasLasReservas(
        idAnticipo: number
    ): Promise<{ idAnticipo: number; lotesProcesados: number; totalLiberado: number }> {
        return http.post<{ idAnticipo: number; lotesProcesados: number; totalLiberado: number }>(
            `${BASE}/${idAnticipo}/reservas/liberar-todo`
        );
    },

    /**
     * GET /api/v1/anticipos/{id}/reservas
     * Consolidado de reservas VIGENTES (resumen por presentación/almacén).
     */
    reservasVigentes(idAnticipo: number): Promise<ReservaAnticipoRespuestaDTO> {
        return http.get<ReservaAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/reservas`);
    },

    /**
     * GET /api/v1/anticipos/{id}/reservas/detalle
     * Detalle FEFO con lotes (numeroLote, fechaVencimiento).
     */
    verReservasDetalle(idAnticipo: number): Promise<ReservaAnticipoRespuestaDTO> {
        return http.get<ReservaAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/reservas/detalle`);
    },

    /**
     * GET /api/v1/anticipos/{id}/reservas/historico
     * (si lo usas) versión histórica/alternativa. Mismo tipo de respuesta.
     */
    verReservasHistorico(idAnticipo: number): Promise<ReservaAnticipoRespuestaDTO> {
        return http.get<ReservaAnticipoRespuestaDTO>(`${BASE}/${idAnticipo}/reservas/historico`);
    },

    // ===== Conversión de anticipo a venta (endpoint unificado) =====

    /**
     * POST /api/v1/anticipos/{id}/convertir-a-venta
     * body: { tipo: 'contado' | 'credito', montoAplicarBob?, interesCreditoBob? }
     * El backend retornará también el anticipo con estado "transferido_a_venta" cuando corresponda.
     */
    convertirAContado(
        idAnticipo: number,
        dto: ConvertirContadoDTO // { idVenta, aplicarAnticipo?, montoAplicarBob? }
    ): Promise<AnticipoConversionResultadoDTO> {
        const body: any = {
            tipo: "contado" as const,
            idVenta: dto.idVenta,                          // 👈 NECESARIO
        };
        if (dto.aplicarAnticipo !== undefined) body.aplicarAnticipo = dto.aplicarAnticipo;
        if (dto.montoAplicarBob != null) body.montoAplicarBob = dto.montoAplicarBob;
        return http.post<AnticipoConversionResultadoDTO>(`${BASE}/${idAnticipo}/convertir-a-venta`, body);
    },

    convertirACredito(
        idAnticipo: number,
        dto: ConvertirCreditoDTO // { idVenta, aplicarAnticipo?, montoAplicarBob?, interesCreditoBob? }
    ): Promise<AnticipoConversionResultadoDTO> {
        const body: any = {
            tipo: "credito" as const,
            idVenta: dto.idVenta,                          // 👈 NECESARIO
        };
        if (dto.aplicarAnticipo !== undefined) body.aplicarAnticipo = dto.aplicarAnticipo;
        if (dto.montoAplicarBob != null) body.montoAplicarBob = dto.montoAplicarBob;
        if (dto.interesCreditoBob != null) body.interesCreditoBob = dto.interesCreditoBob;
        return http.post<AnticipoConversionResultadoDTO>(`${BASE}/${idAnticipo}/convertir-a-venta`, body);
    },
};
