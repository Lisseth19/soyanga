import { http } from "./http";

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

function sanitizeParams<T extends Record<string, unknown>>(params: T): T {
    // Elimina claves vacías/undefined para no ensuciar la URL
    const p = { ...params };
    Object.keys(p).forEach((k) => {
        const v = (p as any)[k];
        if (v === undefined || v === null || v === "") {
            delete (p as any)[k];
        }
    });
    return p;
}

export async function getInventarioPorLote(
    params: InventarioQuery = {}
): Promise<Page<InventarioPorLoteItem>> {
    const clean = sanitizeParams(params);
    const { data } = await http.get<Page<InventarioPorLoteItem>>(
        "/api/v1/inventario/por-lote",
        { params: clean }
    );
    return data;
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
): Promise<MovimientoDeInventario[]> {
    const { data } = await http.get<MovimientoDeInventario[]>(
        `/api/v1/inventario/lotes/${loteId}/movimientos`,
        { params }
    );
    return data;
}
