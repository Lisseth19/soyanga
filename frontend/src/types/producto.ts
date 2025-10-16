// src/types/producto.ts
export interface ProductoDTO {
  idProducto: number;
  nombreProducto: string;
  descripcion: string | null;
  idCategoria: number;
  principioActivo: string | null;
  registroSanitario: string | null;
  estadoActivo: boolean;
}

// Para crear
export interface ProductoCrearDTO {
  nombreProducto: string;
  descripcion?: string | null;
  idCategoria: number;
  principioActivo?: string | null;
  registroSanitario?: string | null;
  estadoActivo?: boolean; // opcional: por defecto true en backend
}

// Para actualizar (todos opcionales)
export interface ProductoActualizarDTO {
  nombreProducto?: string;
  descripcion?: string | null;
  idCategoria?: number;
  principioActivo?: string | null;
  registroSanitario?: string | null;
  estadoActivo?: boolean;
}

// Útil para combos
export interface OpcionIdNombre {
  id: number;
  nombre: string;
}
// ===============================
// ↓↓↓ Tipos para CATÁLOGO PÚBLICO ↓↓↓
// ===============================
export interface CatalogVariant {
  id: number;
  sku: string;
  nombreCorto?: string;
  formulacion?: string;
  contenidoNeto?: number;
  unidad?: string;             // "ml" | "L" | "g" | "kg" | etc.
  stockDisponible: number;     // requerido para UI
}

export interface CatalogProduct {
  id: number;
  slug: string;
  nombre: string;
  marca?: string;
  resumen?: string;
  imagenUrl?: string;
  variantes: CatalogVariant[]; // presentaciones / SKUs
}

export interface Page<T> {
  content: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}
