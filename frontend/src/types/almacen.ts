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
