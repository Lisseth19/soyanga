// src/types/impuestos.ts
export interface Impuesto {
    idImpuesto: number;
    nombreImpuesto: string;
    porcentaje: number;       // ej. 0.13 para 13%
    estadoActivo: boolean;
}

export interface ImpuestoCrearDTO {
    nombreImpuesto: string;
    porcentaje: number;
    estadoActivo?: boolean;
}

export interface ImpuestoEditarDTO {
    nombreImpuesto: string;
    porcentaje: number;
    estadoActivo?: boolean;
}

export type Page<T> = {
    content: T[];
    number: number;        // página actual (0-based)
    size: number;          // tamaño de página solicitado
    totalElements: number; // total de registros
    totalPages: number;    // total de páginas
    first: boolean;
    last: boolean;
};

export type ImpuestosListarParams = {
    q?: string | null;
    soloActivos?: boolean;
    page?: number; // 0-based
    size?: number;
};
