// src/types/anticipos.ts

// --- estados exactos del backend ---
export type EstadoAnticipo =
    | "registrado"
    | "parcialmente_aplicado"
    | "aplicado_total"
    | "anulado"
    | "transferido_a_venta";

// --- normalizador (LEGACY -> actual) ---
const LEGACY_ANTICIPO: Record<string, EstadoAnticipo> = {
    vigente: "registrado",
    aplicado_parcial: "parcialmente_aplicado",
} as const;

export function normalizeEstadoAnticipo(v: string): EstadoAnticipo {
    const x = (LEGACY_ANTICIPO as Record<string, string>)[v] ?? v;
    return (
        ["registrado", "parcialmente_aplicado", "aplicado_total", "anulado", "transferido_a_venta"] as const
    ).includes(x as EstadoAnticipo)
        ? (x as EstadoAnticipo)
        : "registrado";
}

// === COMPLETAR LISTADO ===
export interface AnticipoListado {
    idAnticipo: number;
    fechaAnticipo: string;
    idCliente: number | null;
    cliente: string | null;
    montoBob: string;
    estadoAnticipo: string;
    observaciones?: string | null;

    // NUEVOS (vienen del backend)
    aplicadoAcumuladoBob: string;   // total aplicado historico
    saldoDisponibleBob: string;     // montoBob - aplicadoAcumulado
}

export type AnticipoResumen = AnticipoListado;

// Entidad principal
export interface Anticipo {
    idAnticipo: number;
    idCliente: number;
    fechaAnticipo: string; // ISO datetime
    montoBob: number;
    estadoAnticipo: EstadoAnticipo;
    observaciones?: string | null;

    // Opcionales
    fechaVencimiento?: string | null; // ISO date
    idMoneda?: number | null;
    montoMoneda?: number | null;
    tcALocal?: number | null;
    montoLocal?: number | null;
}

// ===== Aplicaciones de anticipo (dinero) =====

export interface AplicarAnticipoDTO {
    idVenta: number;
    montoAplicadoBob: number;
}

export type EstadoCxc = "pendiente" | "parcial" | "pagado" | "vencido";

export interface AplicarAnticipoRespuestaDTO {
    idAplicacionAnticipo: number;
    idAnticipo: number;
    idVenta: number;
    montoAplicadoBob: number;
    fechaAplicacion: string; // ISO
    saldoAnticipoAntes: number;
    saldoAnticipoDespues: number;
    cxcPendienteAntes: number;
    cxcPendienteDespues: number;
    estadoAnticipo: EstadoAnticipo;
    estadoCxc: EstadoCxc;
}

// Historial de aplicaciones (cada fila)
export interface AplicacionAnticipoItem {
    idAplicacionAnticipo: number;
    idAnticipo: number;
    idVenta: number;
    montoAplicadoBob: number;
    fechaAplicacion: string; // ISO
}

// ===== Paginado genérico =====
export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // page index
    size: number;
}

export type PageAnticipos = Page<AnticipoResumen>;
export type PageAplicacionAnticipo = Page<AplicacionAnticipoItem>;

// ===== Crear anticipo =====
export interface AnticipoCrearDTO {
    idCliente?: number | null; // backend lo acepta opcional
    montoBob: number;
    observaciones?: string | null;
}

// ===== Reservas de anticipos (STOCK) =====

export interface LotePick {
    idLote: number;
    cantidad: number;
    numeroLote?: string | null;
    fechaVencimiento?: string | null; // ISO date
}

/** Request oficial del backend para RESERVAR: cada ítem indica su almacén */
export interface ReservaAnticipoDTO {
    items: Array<{
        idPresentacion: number;
        idAlmacen: number;
        cantidad: number;
    }>;
}

/** Request oficial del backend para LIBERAR parcial: igual estructura */
export interface LiberarReservaAnticipoDTO {
    items: Array<{
        idPresentacion: number;
        idAlmacen: number;
        cantidad: number;
    }>;
}

/** Respuesta oficial del backend para reservar/liberar/consulta (vigentes o detalle) */
export interface ReservaAnticipoRespuestaDTO {
    idAnticipo: number;
    operacion: "reservar" | "liberar" | "consulta";
    itemsProcesados: number;
    resultados: Array<{
        idPresentacion: number;
        idAlmacen: number;
        cantidadProcesada: number; // reservado (+) o total según operación
        lotes: Array<{
            idLote: number;
            cantidad: number;
            numeroLote?: string | null; // viene en /reservas/detalle
            fechaVencimiento?: string | null; // viene en /reservas/detalle
        }>;
    }>;
}

/**
 * LEGACY (frontend conveniente): idAlmacen arriba, ítems sin almacén.
 * Lo seguimos aceptando en el servicio y lo convertimos a ReservaAnticipoDTO.
 */
export interface AnticipoReservaDTO {
    idAlmacen: number;
    items: Array<{
        idPresentacion: number;
        cantidad: number;
    }>;
}

/** @deprecated Usa `ReservaAnticipoRespuestaDTO` */
export interface AnticipoReservaRespuestaDTO {
    idAnticipo: number;
    idAlmacen: number;
    reservas: Array<{
        idPresentacion: number;
        cantidadSolicitada: number;
        cantidadReservada: number;
        lotes: LotePick[];
    }>;
}

// ===== Conversión de anticipo a venta =====

export interface ConvertirContadoDTO {
    idVenta: number;
    aplicarAnticipo?: boolean; // default true en backend
    montoAplicarBob?: number | null; // si no se envía, aplica todo el saldo
}

export interface ConvertirCreditoDTO extends ConvertirContadoDTO {
    interesCreditoBob?: number | null; // opcional, si la venta tiene interés
}

export interface AnticipoConversionResultadoDTO {
    idAnticipo: number;
    idVenta: number;
    reservasConsumidas: number; // cantidad de movimientos/lotes consumidos
    unidadesConsumidas: number; // suma de cantidades
    montoAplicado: number; // del anticipo a la venta
}
// === NUEVOS TIPOS ===
export interface ConvertirEnVentaReq {
    idVenta: number;                // obligatorio
    montoAplicarBob?: string;       // opcional (null/undefined => aplica todo)
}

export interface ConvertirEnVentaResp {
    modo: "credito" | "contado";
    idAnticipo: number;
    idVenta: number;
    lotesConsumidos: number;
    unidadesConsumidas: string;     // BigDecimal serializado
    aplicadoEnEstaOperacion: string;
    aplicadoAcumulado: string;
    saldoAnticipoDespues: string;
}