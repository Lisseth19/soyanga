export interface AjusteCrearDTO {
  idAlmacen: number;
  idLote: number;
  cantidad: number;
  motivoCodigo: string;
  observaciones?: string;
  requestId: string;
}

export interface AjusteRespuestaDTO {
  idMovimiento: number | null;
  tipo: "ingreso" | "salida";
  idAlmacen: number;
  idLote: number;
  cantidadAjustada: number | string;
  cantidadAnterior?: number | string | null;
  cantidadNueva?: number | string | null;
  fechaMovimiento: string;
  observaciones?: string | null;
}
