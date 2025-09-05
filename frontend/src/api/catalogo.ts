import { http } from "./http";

export interface OpcionIdNombre {
    id: number;
    nombre: string;
}

export async function getAlmacenesOpciones(
    activos = true
): Promise<OpcionIdNombre[]> {
    const { data } = await http.get<OpcionIdNombre[]>(
        "/api/v1/almacenes/opciones",
        { params: { activos } }
    );
    return data;
}
