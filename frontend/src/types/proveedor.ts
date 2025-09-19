// src/types/proveedor.ts

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
