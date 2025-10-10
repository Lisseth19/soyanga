// src/servicios/permiso.ts
import { http } from "./httpClient";
import type { Page } from "@/types/pagination";
import type { PermisoDTO, PermisoCrearDTO, PermisoEditarDTO } from "@/types/permiso";

const BASE = "/v1/seguridad/permisos";

export interface PermisosFiltro {
    q?: string;
    soloActivos?: boolean;
    page?: number;
    size?: number;
}

export const PermisoService = {
    listar: (params: PermisosFiltro = {}) => {
        const query: Record<string, unknown> = { ...params };
        return http.get<Page<PermisoDTO>>(BASE, { params: query });
    },

    obtener: (id: number) =>
        http.get<PermisoDTO>(`${BASE}/${id}`),

    crear: (dto: PermisoCrearDTO) =>
        http.post<PermisoDTO, PermisoCrearDTO>(BASE, dto),

    editar: (id: number, dto: PermisoEditarDTO) =>
        http.put<PermisoDTO, PermisoEditarDTO>(`${BASE}/${id}`, dto),

    eliminar: (id: number) =>
        http.del<void>(`${BASE}/${id}`),

    activar: (id: number) =>
        http.patch<PermisoDTO>(`${BASE}/${id}/activar`),

    desactivar: (id: number) =>
        http.patch<PermisoDTO>(`${BASE}/${id}/desactivar`),
};
