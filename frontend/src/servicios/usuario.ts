// src/servicios/usuario.ts
import { http } from "./httpClient";
import type { Page } from "@/types/pagination";
import type {
    UsuarioDTO,
    UsuarioCrearDTO,
    UsuarioEditarDTO,
    UsuarioCambiarPasswordDTO,
    UsuarioAsignarRolesDTO,
} from "@/types/usuario";

const BASE = "/v1/seguridad/usuarios";

export interface UsuariosFiltro {
    q?: string;
    soloActivos?: boolean;
    page?: number; // 0-based
    size?: number; // default 20
}

export const UsuarioService = {
    listar: (params: UsuariosFiltro = {}) => {
        // ⬇⬇⬇ CAST seguro para satisfacer httpClient (params: Record<string, unknown>)
        const query: Record<string, unknown> = { ...params };
        return http.get<Page<UsuarioDTO>>(BASE, { params: query });
    },

    obtener: (id: number) =>
        http.get<UsuarioDTO>(`${BASE}/${id}`),

    crear: (dto: UsuarioCrearDTO) =>
        http.post<UsuarioDTO, UsuarioCrearDTO>(BASE, dto),

    editar: (id: number, dto: UsuarioEditarDTO) =>
        http.put<UsuarioDTO, UsuarioEditarDTO>(`${BASE}/${id}`, dto),

    eliminar: (id: number) =>
        http.del<void>(`${BASE}/${id}`),

    cambiarPassword: (id: number, dto: UsuarioCambiarPasswordDTO) =>
        http.put<void, UsuarioCambiarPasswordDTO>(`${BASE}/${id}/password`, dto),

    cambiarEstado: (id: number, activo: boolean) =>
        http.patch<void>(`${BASE}/${id}/estado`, undefined, { params: { activo } }),

    asignarRoles: (id: number, dto: UsuarioAsignarRolesDTO) =>
        http.put<UsuarioDTO, UsuarioAsignarRolesDTO>(`${BASE}/${id}/roles`, dto),
};
