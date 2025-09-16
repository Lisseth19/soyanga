// =========================
// Query (filtros + paginado)
// =========================
export interface InventarioLotesQuery {
    idAlmacen?: number;
    q?: string;
    venceAntes?: string; // YYYY-MM-DD
    page?: number;
    size?: number;
}

// =========================
// DTO del backend (tal cual Java)
// =========================
export interface InventarioPorLoteResponse {
    almacenId: number;
    almacen: string;

    loteId: number;
    numeroLote: string;

    presentacionId: number;
    sku: string;
    producto: string;

    disponible: number;     // BigDecimal -> number
    reservado: number;      // BigDecimal -> number
    vencimiento: string;    // LocalDate -> 'YYYY-MM-DD'
    stockMinimo?: number | null;
}

// =========================
// Tipo usado por la UI (tabla)
// =========================
export interface InventarioPorLoteItem {
    idAlmacen: number;
    nombreAlmacen: string;
    idLote: number;
    codigoLote: string;
    idPresentacion: number;
    sku: string;
    nombreProducto: string;
    disponible: number;
    reservado: number;
    fechaVencimiento: string;
    stockMinimo?: number | null;
}

// =========================
// Movimientos por lote
// =========================

// Tipo canónico que usará la UI (modal)
export type TipoMovimiento = "ENTRADA" | "SALIDA" | "AJUSTE" | string;

export interface MovimientoDeInventario {
    fecha: string;                 // YYYY-MM-DD o ISO
    tipo: TipoMovimiento;          // p.ej. "ENTRADA", "SALIDA", "AJUSTE"
    cantidad: number;              // BigDecimal -> number
    referenciaModulo: string;      // p.ej. "COMPRA", "VENTA", "AJUSTE"
    idReferencia: number;          // id del documento origen
    almacenOrigen?: string | null; // nombre del almacén origen (si aplica)
    almacenDestino?: string | null;// nombre del almacén destino (si aplica)
    observaciones?: string | null;
}

// (Opcional) Forma “raw” que podría devolver tu backend.
// La usamos solo como ayuda para mapear → MovimientoDeInventario
// en el servicio (acepta alias comunes).
export interface MovimientoDeInventarioDTO {
    // fechas
    fecha?: string;
    fechaMovimiento?: string;
    fchMovimiento?: string;
    fch?: string;
    fecha_registro?: string;
    createdAt?: string;

    // tipo
    tipo?: string;
    tipoMovimiento?: string;
    clase?: string;
    movimiento?: string;

    // cantidades
    cantidad?: number;
    qty?: number;
    monto?: number;

    // referencia
    referenciaModulo?: string;
    modulo?: string;
    referencia?: string;

    idReferencia?: number;
    referenciaId?: number;
    id?: number;

    // origen / destino
    almacenOrigen?: string | null;
    origen?: string | null;
    almacen_origen?: string | null;
    origenNombre?: string | null;

    almacenDestino?: string | null;
    destino?: string | null;
    almacen_destino?: string | null;
    destinoNombre?: string | null;

    // otros
    observaciones?: string | null;
    obs?: string | null;
}
