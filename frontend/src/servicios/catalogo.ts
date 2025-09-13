import { http } from "./httpClient";

export interface OpcionIdNombre {
    id: number;
    nombre: string;
}

export async function getAlmacenesOpciones(activos = true) {
  return http.get<OpcionIdNombre[]>(
    "/v1/almacenes/opciones",
    { params: { activos } }
  );
}
