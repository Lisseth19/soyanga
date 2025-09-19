export type Cliente = {
    idCliente: number;
    razonSocialONombre: string;
    nit?: string;
    telefono?: string;
    correoElectronico?: string;
    direccion?: string;
    ciudad?: string;
    condicionDePago?: "contado" | "credito";
    limiteCreditoBob?: number | string;
    estadoActivo: boolean;
};
