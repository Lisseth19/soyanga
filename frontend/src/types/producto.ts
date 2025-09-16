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
