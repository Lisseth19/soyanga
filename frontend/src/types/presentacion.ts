export type PresentacionDTO = {
  idPresentacion: number;
  idProducto: number;
  idUnidad: number;
  contenidoPorUnidad: string | number; // BigDecimal → string está ok
  codigoSku: string;
  costoBaseUsd: string | number;
  margenVentaPorcentaje: string | number;
  precioVentaBob: string | number;
  estadoActivo: boolean;
  imagenUrl?: string | null;
};

export type PresentacionCrearDTO = {
  idProducto: number;
  idUnidad: number;
  contenidoPorUnidad: number;
  codigoSku: string;
  costoBaseUsd?: number;
  margenVentaPorcentaje?: number;
  precioVentaBob?: number;
};

export type PresentacionActualizarDTO = Partial<
  Omit<PresentacionCrearDTO, "idProducto">
> & { estadoActivo?: boolean };

export type CodigoBarrasDTO = {
  idCodigoBarras: number;
  idPresentacion: number;
  codigoBarras: string;
  descripcion?: string | null;
};

export type CodigoBarrasCrearDTO = {
  codigoBarras: string;
  descripcion?: string;
};

export type PrecioNuevoDTO = {
  precioVentaBob: number;
  fechaInicioVigencia: string; // "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss" según tu DTO
};

export type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};
