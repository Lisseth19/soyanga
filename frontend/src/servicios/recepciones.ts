import { http } from "@/servicios/httpClient";
import type { RecepcionCrearDTO, RecepcionRespuestaDTO } from "@/types/recepciones";

const BASE = "/v1/compras/recepciones";

export const recepcionesService = {
  crear(dto: RecepcionCrearDTO) {
    return http.post<RecepcionRespuestaDTO>(BASE, dto);
  },
  cerrar(id: number) {
    return http.patch<void>(`${BASE}/${id}/cerrar`);
  },
  // opcional si agregaste GETs en backend:
  list(compraId?: number) {
    return http.get<any[]>(BASE, { params: compraId ? { compraId } : {} });
  },
  get(id: number) {
    return http.get(`${BASE}/${id}`);
  },
};
