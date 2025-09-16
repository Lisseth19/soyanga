// src/servicios/almacenes.ts  (o donde tengas este servicio)
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type { Almacen, AlmacenCrear, AlmacenActualizar } from "@/types/almacen";

export interface OpcionIdNombre {
  id: number;
  nombre: string;
}

const base = "/v1/catalogo/almacenes";

export const almacenService = {
  async list(params: {
    q?: string;
    incluirInactivos?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<Page<Almacen>> {
    return http.get(base, { params });
  },

  // ✅ NUEVO: para combos/selects
  async options(params?: { q?: string; incluirInactivos?: boolean }): Promise<OpcionIdNombre[]> {
    try {
      // Ruta ideal si tu backend la tiene
      return await http.get(`${base}/opciones`, { params });
    } catch (e: any) {
      // Fallback si /opciones no existe (404) → construye la lista desde list()
      const page = await http.get<Page<Almacen>>(base, {
        params: {
          q: params?.q,
          incluirInactivos: params?.incluirInactivos ?? false,
          page: 0,
          size: 1000,
          sort: "nombreAlmacen,asc",
        },
      });
      return (page.content ?? []).map(a => ({ id: a.idAlmacen, nombre: a.nombreAlmacen }));
    }
  },

  async create(dto: AlmacenCrear): Promise<Almacen> {
    return http.post(base, dto);
  },

  async update(id: number, dto: AlmacenActualizar): Promise<Almacen> {
    return http.put(`${base}/${id}`, dto);
  },

  async toggleActivo(id: number, activo: boolean): Promise<void> {
    return http.patch(`${base}/${id}/estado`, { activo });
  },

  async remove(id: number): Promise<void> {
    return http.del(`${base}/${id}`);
  },
};
