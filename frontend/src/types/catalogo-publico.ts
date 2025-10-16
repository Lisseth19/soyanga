// src/types/catalogo-publico.ts

/** Page genérica (si ya tienes otra en común, puedes unificar) */
export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/** Ítem del listado público de productos (card del catálogo) */
export type ProductoPublicoResumenDTO = {
  idProducto: number;
  nombreProducto: string;
  descripcion?: string | null;

  idCategoria?: number | null;
  categoriaNombre?: string | null;

  principioActivo?: string | null;
  registroSanitario?: string | null;

  /** Portada (primera imagen de alguna presentación activa) */
  imagenUrl?: string | null;

  /** Cantidad de presentaciones activas */
  cantidadPresentaciones: number;
};

/** Presentación expuesta públicamente (detalle) */
export type PresentacionPublicaDTO = {
  idPresentacion: number;
  codigoSku?: string | null;

  idUnidad?: number | null;
  contenidoPorUnidad?: number | null;

  /** Unidad mostrable (se llenan desde el backend) */
  unidadNombre?: string | null;   // p.ej. "Litro", "Kilos"
  unidadSimbolo?: string | null;  // p.ej. "L", "Kg"

  /** Precio público si decides mostrarlo (puede venir null) */
  precioVentaBob?: number | null;

  /** Imagen de la presentación (si existe) */
  imagenUrl?: string | null;
};

/** Detalle público de un producto (incluye presentaciones activas) */
export type ProductoPublicoDetalleDTO = {
  idProducto: number;
  nombreProducto: string;
  descripcion?: string | null;

  idCategoria?: number | null;
  categoriaNombre?: string | null;

  principioActivo?: string | null;
  registroSanitario?: string | null;

  /** Portada (puede ser igual a la de alguna presentación) */
  imagenUrl?: string | null;

  presentaciones: PresentacionPublicaDTO[];
};
