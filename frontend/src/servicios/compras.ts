// src/servicios/compras.ts
import { http } from "@/servicios/httpClient";
import type {
  Compra, CompraCrearDTO, CompraDetalleCrearDTO, CompraEstado, Page
} from "@/types/compras";

const BASE = "/v1/compras";

export type ListComprasParams = {
  estado?: CompraEstado | "";
  proveedorId?: number;
  desde?: string; // YYYY-MM-DD o ISO
  hasta?: string; // YYYY-MM-DD o ISO
  page?: number;
  size?: number;
};

function toIsoDateTime(d?: string, isEnd = false) {
  if (!d) return undefined;
  if (d.includes("T")) return d;
  return isEnd ? `${d}T23:59:59` : `${d}T00:00:00`;
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    out[k] = v;
  });
  return out as T;
}

export const comprasService = {
  listar(params: ListComprasParams): Promise<Page<any>> {
    const q = clean({
      ...params,
      desde: toIsoDateTime(params.desde, false),
      hasta: toIsoDateTime(params.hasta, true),
    });
    return http.get<Page<any>>(BASE, { params: q });
  },

  obtener(id: number): Promise<Compra> {
    return http.get<Compra>(`${BASE}/${id}`);
  },

  crear(dto: CompraCrearDTO): Promise<Compra> {
    return http.post<Compra>(BASE, dto);
  },

  agregarItem(idCompra: number, dto: CompraDetalleCrearDTO) {
    return http.post(`${BASE}/${idCompra}/items`, dto);
  },

  actualizarItem(
      idCompra: number,
      idDetalle: number,
      dto: { cantidad?: number; costoUnitarioMoneda?: number; fechaEstimadaRecepcion?: string | null }
  ) {
    return http.put(`${BASE}/${idCompra}/items/${idDetalle}`, dto);
  },

  eliminarItem(idCompra: number, idDetalle: number) {
    return http.del(`${BASE}/${idCompra}/items/${idDetalle}`);
  },

  cambiarEstado(id: number, nuevo: CompraEstado) {
    // si tu back espera query param ?nuevo=
    return http.post(`${BASE}/${id}/estado`, undefined, { params: { nuevo } });
    // si en tu back es body: return http.post(`${BASE}/${id}/estado`, { nuevo });
  },

  aprobar(id: number) {
    return http.post(`${BASE}/${id}/aprobar`);
  },

  anular(id: number, motivo?: string) {
    return http.post(`${BASE}/${id}/anular`, undefined, {
      params: motivo ? { motivo } : {},
    });
  },
   eliminar(id: number) {
    // BASE = "/v1/compras"  -> con baseURL /api en http => /api/v1/compras/{id}
    return http.del(`${BASE}/${id}`);
  },

};
