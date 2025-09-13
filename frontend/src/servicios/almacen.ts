import { http } from "@/servicios/httpClient"; // o donde lo tengas
import type { Page } from "@/types/pagination";
import type { Almacen, AlmacenCrear, AlmacenActualizar } from "@/types/almacen";

const base = "/v1/catalogo/almacenes";

export const almacenService = {
  async list(params: {
    q?: string;
    incluirInactivos?: boolean;
    page?: number;
    size?: number;
    sort?: string; // opcional
  }): Promise<Page<Almacen>> {
    return http.get(base, { params });
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
