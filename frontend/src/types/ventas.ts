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
export type VentaListado = {
    idVenta: number;
    fechaVenta: string;
    idCliente: number | null;
    cliente: string | null;
    estadoVenta: VentaEstado | string;
    tipoDocumentoTributario: TipoDocumentoTributario | string;
    numeroDocumento: string | null;
    metodoDePago: MetodoPago | string;
    condicionDePago: CondicionPago | string;
    totalNetoBob: number;
    cxcPendienteBob: number;
};

// ------- CREAR -------
export type VentaItemCrear = {
    idPresentacion: number;
    cantidad: number;
    precioUnitarioBob?: number;
    descuentoPorcentaje?: number;
    descuentoMontoBob?: number;
};

// src/types/ventas.ts
export type VentaCrearDTO = {
    idCliente?: number | null;
    tipoDocumentoTributario: TipoDocumentoTributario; // 'boleta' | 'factura'
    condicionDePago: CondicionPago;                   // 'contado' | 'credito'
    fechaVencimientoCredito?: string | null;
    idAlmacenDespacho: number;
    metodoDePago?: MetodoPago;
    observaciones?: string | null;
    items: VentaItemCrear[];
    // 👇 NUEVOS
    impuestoId?: number | null;       // requerido si factura
    interesCredito?: number | null;   // opcional si crédito
};


export type VentaCrearRespuesta = {
    idVenta: number;
    totalBrutoBob: number;
    descuentoTotalBob: number;
    totalNetoBob: number;
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
    cxc?: {
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

// ------- TRAZABILIDAD -------
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
