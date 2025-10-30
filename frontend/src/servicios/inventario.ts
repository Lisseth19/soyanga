// src/servicios/inventario.ts
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type {
    InventarioLotesQuery,
    InventarioPorLoteItem,
    InventarioPorLoteResponse,
    MovimientoDeInventario,      // <- tipo canónico para la UI
    MovimientoDeInventarioDTO,   // <- forma “raw” que puede devolver el backend
} from "@/types/inventario-lotes";

const base = "/v1/inventario/lotes";

function clean<T extends Record<string, any>>(obj: T): Partial<T> {
    const o: Partial<T> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== null && v !== "") (o as any)[k] = v;
    }
    return o;
}

/** DTO (backend) -> Item de UI (nombres que usa la tabla) */
function mapToItem(r: InventarioPorLoteResponse): InventarioPorLoteItem {
    return {
        idAlmacen: r.almacenId,
        nombreAlmacen: r.almacen,
        idLote: r.loteId,
        codigoLote: r.numeroLote,
        idPresentacion: r.presentacionId,
        sku: r.sku,
        nombreProducto: r.producto,
        disponible: Number(r.disponible),
        reservado: Number(r.reservado),
        fechaVencimiento: r.vencimiento,
        stockMinimo: r.stockMinimo ?? null,
    };
}

export async function getInventarioPorLote(params: InventarioLotesQuery) {
    const query = clean({
        almacenId: params.idAlmacen, // el backend espera 'almacenId'
        q: params.q,
        venceAntes: params.venceAntes,
        page: params.page ?? 0,
        size: params.size ?? 20,
    });

    const page = await http.get<Page<InventarioPorLoteResponse>>(base, { params: query });
    return { ...page, content: (page.content ?? []).map(mapToItem) } as Page<InventarioPorLoteItem>;
}

/* =========================
   Movimientos (DTO -> UI)
   ========================= */

/** Normaliza un registro crudo del backend a nuestro tipo canónico de la UI */
function mapMovimiento(m: MovimientoDeInventarioDTO): MovimientoDeInventario {
    return {
        // fecha: toma la primera que venga con valor
        fecha:
            m.fecha ??
            m.fechaMovimiento ??
            m.fchMovimiento ??
            m.fch ??
            m.fecha_registro ??
            m.createdAt ??
            "",

        // tipo: deja lo que venga (ENTRADA/SALIDA/AJUSTE u otros más específicos)
        tipo: m.tipo ?? m.tipoMovimiento ?? m.clase ?? m.movimiento ?? "",

        // cantidad: asegura number
        cantidad: Number(m.cantidad ?? m.qty ?? m.monto ?? 0),

        // referencia
        referenciaModulo: m.referenciaModulo ?? m.modulo ?? m.referencia ?? "-",
        idReferencia: Number(m.idReferencia ?? m.referenciaId ?? m.id ?? 0),

        // origen / destino (nombres más comunes)
        almacenOrigen:
            m.almacenOrigen ?? m.origen ?? m.almacen_origen ?? m.origenNombre ?? null,
        almacenDestino:
            m.almacenDestino ?? m.destino ?? m.almacen_destino ?? m.destinoNombre ?? null,

        observaciones: m.observaciones ?? m.obs ?? null,
    };
}

export async function getMovimientosDeLote(
    idLote: number,
    params: { idAlmacen?: number; limit?: number } = {}
): Promise<MovimientoDeInventario[]> {
    const raw = await http.get<MovimientoDeInventarioDTO[]>(
        `${base}/${idLote}/movimientos`,
        { params: clean({ almacenId: params.idAlmacen, limit: params.limit }) }
    );
    return (raw ?? []).map(mapMovimiento);
}

// (opcional) re-exporta el tipo UI para que el Modal pueda importar desde el servicio
export type { MovimientoDeInventario } from "@/types/inventario-lotes";

export async function lotesOptionsByAlmacen(idAlmacen: number) {
  const page = await getInventarioPorLote({ idAlmacen, size: 200 });
  return page.content.map(it => ({
    id: it.idLote,
    nombre: `${it.codigoLote} — ${it.nombreProducto}`,
    stock: it.disponible
  }));
}
