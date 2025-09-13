import { http } from "./httpClient";
import type { Page } from "@/types/pagination";
import type {
  Sucursal,
  SucursalCreate,
  SucursalUpdate,
  SucursalFiltro,
} from "@/types/sucursal";


export interface OpcionIdNombre {
  id: number;
  nombre: string;
}


const BASE = "/v1/catalogo/sucursales";

/** Convierte un objeto de filtros a params limpios (Record<string, unknown>) */
function toParams(obj: SucursalFiltro): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  });
  return out;
}

export const sucursalService = {
  list: (filtro: SucursalFiltro = {}) =>
    http.get<Page<Sucursal>>(BASE, { params: toParams(filtro) }),

  get: (id: number) =>
    http.get<Sucursal>(`${BASE}/${id}`),

  create: (payload: SucursalCreate) =>
    http.post<Sucursal, SucursalCreate>(BASE, payload),

  update: (id: number, payload: SucursalUpdate) =>
    http.put<Sucursal, SucursalUpdate>(`${BASE}/${id}`, payload),

  remove: (id: number) =>
    http.del<void>(`${BASE}/${id}`),

   // ⬇️ NUEVO: opciones para combos (id + nombre)
  opciones: () =>
    http.get<OpcionIdNombre[]>(`${BASE}/opciones`),
};
