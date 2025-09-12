import { http } from "./httpClient";

export interface InventarioPorLoteItem {
    almacenId: number;
    almacen: string;
    loteId: number;
    numeroLote: string;
    presentacionId: number;
    sku: string;
    producto: string;
    disponible: number;
    reservado: number;
    vencimiento: string; // ISO 'YYYY-MM-DD'
    stockMinimo?: number;
}

// Page "minimalista" (solo lo que usaremos en la UI)
export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // página actual (0-based)
    size: number;   // tamaño de página
    first: boolean;
    last: boolean;
}

export type InventarioQuery = {
    almacenId?: number;
    producto?: string;
    venceAntes?: string; // 'YYYY-MM-DD'
    page?: number;       // 0-based
    size?: number;       // ej. 10, 20...
    sort?: string;       // ej. "vencimiento,asc" o "sku,desc"
};

function clean<T extends Record<string, unknown>>(params: T): T {
  const out = { ...params };
  Object.keys(out).forEach((k) => {
    const v = (out as any)[k];
    if (v === undefined || v === null || v === "") delete (out as any)[k];
  });
  return out;
}
export async function getInventarioPorLote(params: InventarioQuery = {}) {
  return http.get<Page<InventarioPorLoteItem>>("/api/v1/inventario/lotes", {
    params: clean(params),
  });
}
// 👇 añade esta interfaz
export interface MovimientoDeInventario {
    fechaMovimiento: string;  // ISO
    tipoMovimiento: string;   // 'ingreso_compra', 'salida_venta', ...
    cantidad: number;
    almacenOrigen?: string | null;
    almacenDestino?: string | null;
    referenciaModulo: string;
    idReferencia: number;
    observaciones?: string | null;
}

export async function getMovimientosDeLote(
  loteId: number,
  params: { almacenId?: number; limit?: number } = {}
) {
  return http.get<MovimientoDeInventario[]>(
    `/api/v1/inventario/lotes/${loteId}/movimientos`,
    { params: clean(params) }
  );
}
