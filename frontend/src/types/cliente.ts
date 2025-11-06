export type CondicionPago = "contado" | "credito";

export type Cliente = {
    idCliente: number;
    razonSocialONombre: string;
    nit?: string;
    telefono?: string;
    correoElectronico?: string;
    direccion?: string;
    ciudad?: string;
    condicionDePago?: CondicionPago;
    limiteCreditoBob?: number | string;
    estadoActivo: boolean;
};

// Para crear: sin id. (limiteCreditoBob como number opcional)
export type ClienteCrearDTO = {
    razonSocialONombre: string;
    nit?: string;
    telefono?: string;
    correoElectronico?: string;
    direccion?: string;
    ciudad?: string;
    condicionDePago?: CondicionPago;
    limiteCreditoBob?: number;
    estadoActivo?: boolean; // default true si no lo envías
};

// Para editar: todos opcionales; el backend decidirá qué campos permite
export type ClienteEditarDTO = Partial<Omit<ClienteCrearDTO, "estadoActivo">> & {
    estadoActivo?: boolean;
};

export type ClienteEstadoDTO = { activo: boolean };
