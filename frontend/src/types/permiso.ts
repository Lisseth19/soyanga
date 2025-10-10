// src/types/permiso.ts

export interface PermisoDTO {
    id: number;
    codigo: string;           // p.ej. "usuarios:write"
    descripcion?: string | null;
    activo: boolean;
    creadoEn?: string;
    actualizadoEn?: string;
}

export interface PermisoCrearDTO {
    codigo: string;
    descripcion?: string;
    activo?: boolean;         // si backend tiene default true
}

export interface PermisoEditarDTO {
    codigo?: string;
    descripcion?: string;
    activo?: boolean;
}
