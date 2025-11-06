// src/servicios/sucursal.ts
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
  /** Listar sucursales — usa incluirInactivos como en el backend */
  list: (filtro: SucursalFiltro = {}) =>
      http.get<Page<Sucursal>>(BASE, { params: toParams(filtro) }),

  /** Obtener una sucursal */
  get: (id: number) => http.get<Sucursal>(`${BASE}/${id}`),

  /** Crear una sucursal */
  create: (payload: SucursalCreate) =>
      http.post<Sucursal, SucursalCreate>(BASE, payload),

  /** Actualizar (PUT) */
  update: (id: number, payload: SucursalUpdate) =>
      http.put<Sucursal, SucursalUpdate>(`${BASE}/${id}`, payload),

  /** Eliminar (DELETE) */
  remove: (id: number) => http.del<void>(`${BASE}/${id}`),

  /** Cambiar estado (PATCH /{id}/estado con body { activo }) */
  toggleActivo: (id: number, activo: boolean) =>
      http.patch<void, { activo: boolean }>(`${BASE}/${id}/estado`, { activo }),

  /** Opciones para combos (acepta incluirInactivos si lo necesitas) */
  opciones: (incluirInactivos?: boolean) =>
      http.get<OpcionIdNombre[]>(`${BASE}/opciones`, {
        params: incluirInactivos === undefined ? undefined : { incluirInactivos },
      }),
};
