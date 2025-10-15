export type RecepcionItemDTO = {
  idCompraDetalle: number;
  idPresentacion: number;
  cantidadRecibida: number;
  costoUnitarioMoneda: number;
  numeroLote: string;
  fechaFabricacion?: string | null;   // YYYY-MM-DD
  fechaVencimiento: string;           // YYYY-MM-DD
  observaciones?: string | null;
};

export type RecepcionCrearDTO = {
  idCompra: number;
  idAlmacen: number;
  fechaRecepcion?: string;            // ISO datetime "YYYY-MM-DDTHH:mm:ss"
  numeroDocumentoProveedor?: string | null;
  observaciones?: string | null;
  items: RecepcionItemDTO[];
};

export type RecepcionRespuestaDTO = {
  idRecepcion: number;
  estado: string;
  itemsCreados: number;
};
