// src/types/cobros.ts
export type EstadoCuenta = 'pendiente' | 'parcial' | 'pagado' | 'vencido';

export interface CxcItem {
    idCuentaCobrar: number;
    idVenta: number;
    idCliente: number;
    cliente: string;
    montoPendienteBob: number;
    fechaEmision: string;      // ISO date
    fechaVencimiento: string;  // ISO date
    estadoCuenta: EstadoCuenta;
}

export type MetodoDePago = 'efectivo' | 'transferencia'| 'mixto';

export interface PagoCrearDTO {
    fechaPago?: string;
    idCliente?: number;
    idMoneda: number;
    montoMoneda: number;
    montoBobEquivalente?: number;
    metodoDePago: MetodoDePago;
    referenciaExterna?: string;
    aplicaACuenta?: boolean;
    aplicaciones?: Array<{ idCuentaCobrar: number; montoAplicadoBob: number }>;
}

export interface PagoRespuestaDTO {
    idPagoRecibido: number;
    montoBobEquivalente: number;
    aplicado: boolean;
    cxcAfectadas: number[];
}

export interface PagoAplicarDTO {
    idCliente?: number;
    items: Array<{ idCuentaCobrar: number; montoAplicadoBob: number }>;
}

export interface PagoAplicarRespuestaDTO {
    idPago: number;
    aplicaciones: number;
    totalAplicado: number;
    detalle?: Array<{
        idCuentaCobrar: number;
        montoAplicadoBob?: number; // nombre probable en tu back
        estadoCxc: EstadoCuenta;
    }>;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // page index
    size: number;
}
export type PageCxc = Page<CxcItem>;

// === Historial de CxC ===
export interface CxcPagoLinea {
    idPago: number;
    fechaPago: string;          // ISO
    metodoDePago: 'efectivo' | 'transferencia' | string;
    referenciaExterna?: string | null;
    montoPagoBob: number;       // informativo (monto del pago)
    aplicadoBob: number;        // lo aplicado a ESTA CxC
    saldoDespues: number;       // saldo de la CxC luego de esta aplicación
}

export interface CxcDetalleDTO {
    idCuentaCobrar: number;
    idVenta: number;
    idCliente?: number | null;
    cliente?: string | null;

    totalACobrar: number;
    totalAplicado: number;
    pendiente: number;

    fechaEmision: string;       // ISO date
    fechaVencimiento: string;   // ISO date
    estadoCuenta: 'pendiente' | 'parcial' | 'pagado' | 'vencido' | string;

    pagos: CxcPagoLinea[];
}

