export interface Moneda {
    idMoneda: number;
    codigo: string;
    nombre: string;
    esLocal: boolean;
    estadoActivo: boolean;
    tasaCambioRespectoLocal?: number | null;
}

export interface MonedaCrear {
    codigo: string;
    nombre: string;
    esLocal: boolean;
    tasaCambioRespectoLocal?: number | null;
}

export interface MonedaActualizar {
    codigo: any;
    nombre?: string;
    esLocal?: boolean;
    tasaCambioRespectoLocal?: number | null;
    estadoActivo?: boolean;
}
