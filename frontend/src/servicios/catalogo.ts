import { api } from "./api";

export interface OpcionIdNombre {
    id: number;
    nombre: string;
}

export async function getAlmacenesOpciones(activos = true): Promise<OpcionIdNombre[]> {
    return api(`/api/v1/almacenes/opciones?activos=${activos ? "true" : "false"}`);
}
