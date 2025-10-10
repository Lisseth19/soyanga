
export interface UsuarioDTO {
    id: number;
    username: string;
    nombreCompleto: string;
    email: string;
    telefono?: string | null;
    activo: boolean;
    // Si tu backend devuelve roles como string[] (nombres), cambia este tipo a string[]
    roles: Array<{ id: number; nombre: string }>;
    creadoEn?: string;      // ISO
    actualizadoEn?: string; // ISO
}

export interface UsuarioCrearDTO {
    username: string;
    nombreCompleto: string;
    email: string;
    telefono?: string;
    password: string;       // contraseña inicial / temporal
    activo?: boolean;       // default true en backend si aplica
    rolesIds?: number[];    // opcional si permites crear con roles
}

export interface UsuarioEditarDTO {
    nombreCompleto?: string;
    email?: string;
    telefono?: string;
    activo?: boolean;
}

export interface UsuarioCambiarPasswordDTO {
    passwordActual?: string; // si el backend la exige para admin = no requerido
    passwordNueva: string;
}

export interface UsuarioAsignarRolesDTO {
    rolesIds: number[];
}
