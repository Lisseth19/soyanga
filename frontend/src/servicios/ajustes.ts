import { http } from "@/servicios/httpClient";
import type { AjusteCrearDTO, AjusteRespuestaDTO } from "@/types/ajustes";

const base = "/v1/inventario/ajustes";

export const ajusteService = {
  async salida(dto: AjusteCrearDTO): Promise<AjusteRespuestaDTO> {
    return http.post(`${base}/salida`, dto);
  },
  async ingreso(dto: AjusteCrearDTO): Promise<AjusteRespuestaDTO> {
    return http.post(`${base}/ingreso`, dto);
  }
};
