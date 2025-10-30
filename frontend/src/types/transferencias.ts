export type EstadoTransferencia = "pendiente" | "en_transito" | "completada" | "anulada";

export interface TransferenciaListado {
  idTransferencia: number;
  fecha: string;                 // ISO
  estado: EstadoTransferencia;
  idAlmacenOrigen: number;
  idAlmacenDestino: number;
  almacenOrigen?: string | null;
  almacenDestino?: string | null;
  items?: number | null;
  observaciones?: string | null;
}

export interface TransferenciaCrearDTO {
  idAlmacenOrigen: number;
  idAlmacenDestino: number;
  fechaTransferencia?: string;   // ISO opcional
  observaciones?: string;
  items: Array<{ idLote: number; cantidad: number }>;
}

export interface TransferenciaDetalleDTO {
  idTransferencia: number;
  fecha: string;
  estado: EstadoTransferencia;
  idAlmacenOrigen: number;
  idAlmacenDestino: number;
  almacenOrigen?: string | null;
  almacenDestino?: string | null;
  observaciones?: string | null;
  items: Array<{
    idLote: number;
    numeroLote: string;
    idPresentacion: number;
    sku: string;
    producto: string;
    cantidad: number;
  }>;
  movimientos: Array<{
    idMovimiento: number;
    fechaMovimiento: string;
    tipoMovimiento: string; // transferencia_salida | transferencia_ingreso | ajuste (si anulación)
    idLote: number;
    cantidad: number;
    idAlmacenOrigen: number | null;
    idAlmacenDestino: number | null;
  }>;
}
