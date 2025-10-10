import { http } from "./httpClient";
import type { Page } from "@/types/pagination";
import type { RolDTO, RolCrearDTO, RolEditarDTO, RolAsignarPermisosDTO, RolEstadoDTO } from "@/types/rol";

const BASE = "/v1/seguridad/roles";

export interface RolesFiltro {
    q?: string;
    page?: number;
    size?: number;
}

/** --- helpers de mapeo al backend --- */
function toBackendCrear(dto: RolCrearDTO | any) {
    return {
        // el backend espera nombreRol y descripcion
        nombreRol: (dto?.nombre ?? dto?.nombreRol ?? "").trim(),
        descripcion: dto?.descripcion?.trim?.() ?? null,
    };
}

function toBackendEditar(dto: RolEditarDTO | any) {
    return {
        nombreRol: (dto?.nombre ?? dto?.nombreRol ?? "").trim(),
        descripcion: dto?.descripcion?.trim?.() ?? null,
    };
}

export const RolService = {
    listar: (params: RolesFiltro = {}) => {
        const query: Record<string, unknown> = { ...params };
        return http.get<Page<RolDTO>>(BASE, { params: query });
    },

    obtener: (id: number) =>
        http.get<RolDTO>(`${BASE}/${id}`),

    crear: (dto: RolCrearDTO) =>
        http.post<RolDTO, any>(BASE, toBackendCrear(dto)),

    editar: (id: number, dto: RolEditarDTO) =>
        http.put<RolDTO, any>(`${BASE}/${id}`, toBackendEditar(dto)),

    eliminar: (id: number) =>
        http.del<void>(`${BASE}/${id}`),

    asignarPermisos: (id: number, dto: RolAsignarPermisosDTO) =>
        // tu backend espera { permisos: number[] }
        http.put<RolDTO, RolAsignarPermisosDTO>(`${BASE}/${id}/permisos`, dto),

    // GET /roles/{id}/permisos -> List<PermisoRespuestaDTO>
    obtenerPermisos: (id: number) =>
        http.get<any[]>(`${BASE}/${id}/permisos`),
    cambiarEstado: (id: number, dto: RolEstadoDTO) =>
        http.patch<RolDTO, RolEstadoDTO>(`${BASE}/${id}/estado`, dto),
};
