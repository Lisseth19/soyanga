// src/types/sucursal.ts
export interface Sucursal {
  idSucursal: number;
  nombreSucursal: string;
  direccion: string;
  ciudad: string;
  estadoActivo: boolean;
}

// Para crear
export interface SucursalCreate {
  nombreSucursal: string;
  direccion: string;
  ciudad: string;
  /** opcional: si no lo envías, el backend lo dejará en true por defecto */
  estadoActivo?: boolean;
}

// Para actualizar (parcial)
export interface SucursalUpdate {
  nombreSucursal?: string;
  direccion?: string;
  ciudad?: string;
  estadoActivo?: boolean;
}

// Filtros de listado (query params)
export interface SucursalFiltro {
  q?: string;           // búsqueda libre por nombre/dirección (si tu API lo soporta)
  ciudad?: string;
  activo?: boolean;
  page?: number;        // 0-based
  size?: number;        // 10, 20, 50...
  sort?: string;        // ej: "nombreSucursal,asc"
}
