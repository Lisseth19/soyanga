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

export type ProveedorEditarDTO = Partial<Omit<ProveedorCrearDTO, "estadoActivo">> & {
    estadoActivo?: boolean;
};

export type ProveedorEstadoDTO = { estadoActivo: boolean };
