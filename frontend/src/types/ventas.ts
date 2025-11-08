// src/types/ventas.ts

export type VentaEstado = 'borrador' | 'confirmada' | 'despachada' | 'anulada';
export type CondicionPago = 'contado' | 'credito';
export type MetodoPago = 'efectivo' | 'transferencia' | 'mixto';
export type TipoDocumentoTributario = 'boleta' | 'factura';

export type Page<T> = {
    content: T[];
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
};

// ------- LISTADO (proyección del backend) -------
export interface VentaListado {
    idVenta: number;
    fechaVenta: string;
    idCliente: number | null;
    cliente: string;
    estadoVenta: 'borrador' | 'confirmada' | 'despachada' | 'anulada';
    tipoDocumentoTributario: 'boleta' | 'factura';
    numeroDocumento: string | null;
    metodoDePago: 'efectivo' | 'transferencia' | 'mixto';
    condicionDePago: 'contado' | 'credito';
    totalNetoBob: number;          // Neto (ya incluye impuesto si es FACTURA)
    cxcPendienteBob?: number | null; // Pendiente vivo (baja con pagos)
    interesCredito?: number | null;  // 👈 NUEVO, porcentaje (ej: 10 = 10%)

};

// ------- CREAR -------
export type VentaItemCrear = {
    idPresentacion: number;
    cantidad: number;
    precioUnitarioBob?: number;
    descuentoPorcentaje?: number;
    descuentoMontoBob?: number;
};

export type VentaCrearDTO = {
    fechaVenta?: string | null; // ISO opcional
    idCliente?: number | null;
    tipoDocumentoTributario: TipoDocumentoTributario; // 'boleta' | 'factura'
    condicionDePago: CondicionPago;                   // 'contado' | 'credito'
    fechaVencimientoCredito?: string | null;
    idAlmacenDespacho: number;
    metodoDePago?: MetodoPago;
    observaciones?: string | null;
    items: VentaItemCrear[];
    // nuevos/confirmados
    impuestoId?: number | null;       // requerido si factura (si no envías, el back toma 1 activo)
    interesCredito?: number | null;   // porcentaje fijo si crédito (ej. 5 = 5%)
};

export type VentaCrearRespuesta = {
    idVenta: number;
    totalBrutoBob: number;
    descuentoTotalBob: number;
    totalNetoBob: number; // incluye impuesto si factura
    impuestoPorcentaje?: number | null;
    impuestoMontoBob?: number | null;
    interesCredito?: number | null;   // % reportado
    asignaciones?: Array<{
        idPresentacion: number;
        sku?: string | null;
        producto?: string | null;
        numeroLote?: string | null;
        vencimiento?: string | null;
        cantidad: number;
        precioUnitarioBob: number;
        subtotalBob: number;
    }>;
};

// ------- DETALLE -------
export type VentaDetalleRespuestaDTO = {
    idVenta: number;
    fechaVenta: string;
    estadoVenta: VentaEstado | string;
    tipoDocumentoTributario: TipoDocumentoTributario | string;
    numeroDocumento: string | null;

    idCliente: number | null;
    cliente: string | null;

    idMoneda: number;
    totalBrutoBob: number;
    descuentoTotalBob: number;
    totalNetoBob: number;

    metodoDePago: MetodoPago | string;
    condicionDePago: CondicionPago | string;
    fechaVencimientoCredito?: string | null;

    idAlmacenDespacho: number;
    observaciones?: string | null;

    // NUEVO: para mostrar interés fijo aplicado a la CxC
    interesCreditoPct?: number | null;    // %
    interesCreditoMonto?: number | null;  // totalNeto * pct/100
    totalCobrarBob?: number | null;       // totalNeto + interes

    cxc: {
        idCuentaCobrar: number;
        estadoCuenta: string;
        montoPendienteBob: number;
        fechaEmision: string;
        fechaVencimiento: string;
        totalPagosAplicadosBob: number;
        totalAnticiposAplicadosBob: number;
    } | null;

    items: Array<{
        idVentaDetalle: number;
        idPresentacion: number;
        sku: string;
        producto: string;
        cantidad: number;
        precioUnitarioBob: number;
        descuentoPorcentaje: number;
        descuentoMontoBob: number;
        subtotalBob: number;
        lotes: Array<{ idLote: number; numeroLote: string; cantidad: number }>;
    }>;
};

// ------- TRAZABILIDAD (sin cambios funcionales) -------
export type VentaTrazabilidadDTO = {
    idVenta: number;
    fechaVenta: string;
    idCliente: number | null;
    cliente: string | null;
    idMoneda: number;
    totalBrutoBob: number;
    descuentoTotalBob: number;
    totalNetoBob: number;
    condicionDePago: CondicionPago | string;
    fechaVencimientoCredito?: string | null;
    idAlmacenDespacho: number;
    estadoVenta: VentaEstado | string;
    idCuentaCobrar?: number | null;
    cxcPendienteBob?: number | null;
    cxcVencimiento?: string | null;
    estadoCxc?: string | null;
    detalles: Array<{
        idVentaDetalle: number;
        idPresentacion: number;
        sku: string;
        producto: string;
        cantidad: number;
        precioUnitarioBob: number;
        lotes: Array<{ idLote: number; numeroLote: string; cantidad: number }>;
    }>;
    movimientos: Array<{
        idMovimiento: number;
        fechaMovimiento: string;
        tipoMovimiento: string;
        idLote: number;
        cantidad: number;
        idAlmacenOrigen?: number | null;
        idAlmacenDestino?: number | null;
    }>;
};

// ------- RESPUESTAS acciones -------
export type DespachoVentaResp = {
    ventaId: number;
    estadoNuevo: VentaEstado | string;
    almacenDespacho: number;
    lotesConsumidos: Record<number, number>;
    movimientosGenerados: number[];
};

export type AnulacionVentaResp = {
    ventaId: number;
    estadoNuevo: VentaEstado | string;
    lotesRevertidos: Record<number, number>;
};
