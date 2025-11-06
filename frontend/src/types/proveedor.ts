// tipos/proveedores.ts
export interface Proveedor {
    idProveedor: number;
    razonSocial: string;
    nit?: string | null;
    contacto?: string | null;
    telefono?: string | null;
    correoElectronico?: string | null;
    direccion?: string | null;
    estadoActivo: boolean;
}

export type ProveedorCrearDTO = {
    razonSocial: string;
    nit?: string | null;
    contacto?: string | null;
    telefono?: string | null;
    correoElectronico?: string | null;
    direccion?: string | null;
    estadoActivo?: boolean; // default true
};

// Para PUT de edición puedes seguir permitiendo estadoActivo opcional
export type ProveedorEditarDTO = Partial<Omit<ProveedorCrearDTO, "estadoActivo">> & {
    estadoActivo?: boolean;
};

// Para el PATCH /{id}/estado el backend espera { activo: boolean }
export type ProveedorEstadoDTO = { activo: boolean };
