export interface Almacen {
  idAlmacen: number;
  idSucursal: number;
  nombreAlmacen: string;
  descripcion?: string | null;
  estadoActivo: boolean;
}

export interface AlmacenCrear {
  idSucursal: number;
  nombreAlmacen: string;
  descripcion?: string | null;
  estadoActivo?: boolean;
}

export interface AlmacenActualizar {
  idSucursal: number;
  nombreAlmacen: string;
  descripcion?: string | null;
  estadoActivo: boolean;
}

/** Coincide con lo que expone tu endpoint /api/v1/catalogo/almacenes/{id}/presentaciones */
export type PresentacionEnAlmacenDTO = {
  idPresentacion: number;
  sku: string | null;
  producto: string;
  presentacion: string | null;
  unidad: string | null;
  stockDisponible: number;
  reservado: number;
  precioBob: number | null;

  // Extras opcionales (tu SQL ya los puede enviar)
  imagenUrl?: string | null;
  loteNumero?: string | null;
  loteVencimiento?: string | null; // ISO date (YYYY-MM-DD)
  loteDisponible?: number | null;
};