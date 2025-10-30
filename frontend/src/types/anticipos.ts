// src/types/anticipos.ts

// Estados exactos del backend
// src/types/anticipos.ts

// --- estados exactos del backend ---
export type EstadoAnticipo =
    | "registrado"
    | "parcialmente_aplicado"
    | "aplicado_total"
    | "anulado";

// --- normalizador (LEGACY -> actual) ---
const LEGACY_ANTICIPO: Record<string, EstadoAnticipo> = {
    vigente: "registrado",
    aplicado_parcial: "parcialmente_aplicado",
} as const;

export function normalizeEstadoAnticipo(v: string): EstadoAnticipo {
    const x = (LEGACY_ANTICIPO as Record<string, string>)[v] ?? v;
    return (["registrado","parcialmente_aplicado","aplicado_total","anulado"] as const)
        .includes(x as EstadoAnticipo)
        ? (x as EstadoAnticipo)
        : "registrado";
}

// --- tipo del listado que devuelve tu API ---
export interface AnticipoListado {
    idAnticipo: number;
    fechaAnticipo: string;
    idCliente: number;
    cliente?: string | null;
    montoBob: number;
    estadoAnticipo: EstadoAnticipo;
    observaciones?: string | null;

    // NUEVOS
    aplicadoAcumuladoBob: number;
    saldoDisponibleBob: number;
}


// alias opcional si ya usabas este nombre
export type AnticipoResumen = AnticipoListado;

// Entidad principal (si necesitas mostrar detalle completo)
export interface Anticipo {
    idAnticipo: number;
    idCliente: number;
    fechaAnticipo: string;        // ISO datetime
    montoBob: number;
    estadoAnticipo: EstadoAnticipo;
    observaciones?: string | null;

    // Campos opcionales que existen en DB pero quizá no uses aún:
    fechaVencimiento?: string | null; // ISO date
    idMoneda?: number | null;
    montoMoneda?: number | null;
    tcALocal?: number | null;
    montoLocal?: number | null;
}

// DTOs
export interface AnticipoCrearDTO {
    idCliente: number;
    montoBob: number;
    observaciones?: string;
}

export interface AplicarAnticipoDTO {
    idVenta: number;
    montoAplicadoBob: number;
}

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
    estadoCxc: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
}

// Historial de aplicaciones (filas)
export interface AplicacionAnticipoItem {
    idAplicacionAnticipo: number;
    idAnticipo: number;
    idVenta: number;
    montoAplicadoBob: number;
    fechaAplicacion: string; // ISO
}

// Page local (mismo patrón que compras)
export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // page index
    size: number;
}
// --- reservas de anticipos ---

/** Para liberar reservas (parcial) */
export interface LiberarReservaAnticipoDTO {
    items: Array<{
        idPresentacion: number;
        idAlmacen: number;
        cantidad: number;
    }>;
}

/** Lote seleccionado/afectado (FEFO) */
export interface LotePick {
    idLote: number;
    numeroLote: string;
    cantidad: number;
    vencimiento?: string; // ISO date
}

/** Respuesta al reservar stock para un anticipo */
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

/** Respuesta genérica al reservar/liberar (detalle por item) */
export interface ReservaAnticipoRespuestaDTO {
    operacion: "reservar" | "liberar";
    itemsProcesados: number;
    resultados: Array<{
        idPresentacion: number;
        idAlmacen: number;
        cantidadProcesada: number;
        lotes: LotePick[];
    }>;
}

export interface AnticipoReservaDTO {
    idAlmacen: number;
    items: Array<{ idPresentacion: number; cantidad: number }>;
}

// Paginado específico
export type PageAnticipos = Page<AnticipoResumen>;
export type PageAplicacionAnticipo = Page<AplicacionAnticipoItem>;
