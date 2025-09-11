import { http } from "./httpClient";

export interface OpcionIdNombre {
    id: number;
    nombre: string;
}

export async function getAlmacenesOpciones(activos = true) {
  return http.get<OpcionIdNombre[]>(
    "/api/v1/almacenes/opciones",
    { params: { activos } }
  );
}
