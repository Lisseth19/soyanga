export type RolDTO = {
    id: number;
    nombre: string;                 // nombre "bonito" para UI
    descripcion?: string | null;
    permisos?: Array<any> | number[];
    estadoActivo?: boolean;         // <- importante para UI
    creadoEn?: string | null;
    actualizadoEn?: string | null;
};

// Aceptamos ambas claves para no pelear con el backend
export type RolCrearDTO = {
    nombre?: string;
    nombreRol?: string;
    descripcion?: string | null;
    estadoActivo?: boolean;
};

export type RolEditarDTO = {
    nombre?: string;
    nombreRol?: string;
    descripcion?: string | null;
    estadoActivo?: boolean;
};

export type RolAsignarPermisosDTO = {

    permisos: number[];
};
export interface RolEstadoDTO {
    estadoActivo: boolean;
}