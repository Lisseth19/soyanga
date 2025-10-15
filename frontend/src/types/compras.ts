// 1) TIPOS — src/types/compras.ts
//-------------------------------------------------
export type CompraEstado =
  | 'pendiente' | 'aprobada' | 'enviada' | 'parcial' | 'recibida' | 'anulada';

export interface Compra {
  idCompra: number;
  idProveedor: number;
  proveedor?: string | null;
  fechaCompra: string; // ISO
  idMoneda: number;
  tipoCambioUsado: number;
  estado: CompraEstado;
  observaciones?: string | null;
  totalItems: number;
  totalMoneda: number;
  items: CompraDetalle[];
}

export interface CompraDetalle {
  idCompraDetalle: number;
  idPresentacion: number;
  cantidad: number;
  costoUnitarioMoneda: number;
  fechaEstimadaRecepcion?: string | null; // ISO date
}

export interface CompraCrearDTO {
  idProveedor: number;
  idMoneda: number;
  tipoCambioUsado: number;
  fechaCompra?: string; // ISO
  observaciones?: string;
}

export interface CompraDetalleCrearDTO {
  idPresentacion: number;
  cantidad: number;
  costoUnitarioMoneda: number;
  fechaEstimadaRecepcion?: string; // ISO date
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // page index
  size: number;
}