export interface Unidad {
  idUnidad: number;
  nombreUnidad: string;
  simboloUnidad: string;
  factorConversionBase: number;
}

export interface UnidadCrearDTO {
  nombreUnidad: string;
  simboloUnidad: string;
  factorConversionBase?: number; // si no mandas, el backend usa 1
}

export interface UnidadActualizarDTO {
  nombreUnidad?: string;
  simboloUnidad?: string;
  factorConversionBase?: number;
}

export type Page<T> = {
  content: T[];
  number: number;          // page index
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  sort?: unknown;
};
