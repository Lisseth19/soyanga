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
  /** opcional: si no lo envías, el backend lo deja en true */
  estadoActivo?: boolean;
}

// Para actualizar (parcial o total)
export interface SucursalUpdate {
  nombreSucursal?: string;
  direccion?: string;
  ciudad?: string;
  estadoActivo?: boolean;
}

// Filtros de listado (query params)
// reemplazamos 'activo' por 'incluirInactivos' para alinear con el backend
export interface SucursalFiltro {
  q?: string;
  ciudad?: string;
  incluirInactivos?: boolean; // true = trae todos; false/undefined = solo activos
  page?: number;              // 0-based
  size?: number;              // 10, 20, 50...
  sort?: string;              // ej: "nombreSucursal,asc"
}
