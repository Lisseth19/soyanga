import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type {
  TransferenciaCrearDTO,
  TransferenciaDetalleDTO,
  TransferenciaListado,
} from "@/types/transferencias";

const base = "/v1/inventario/transferencias";

export const transferenciasService = {
  // listado con filtros
  async list(params: {
    estado?: string;
    origenId?: number;
    destinoId?: number;
    desde?: string;   // yyyy-mm-dd
    hasta?: string;   // yyyy-mm-dd
    page?: number;
    size?: number;
  }): Promise<Page<TransferenciaListado>> {
    return http.get(base, { params });
  },

  // crear y completar en un paso
  async crearCompleta(dto: TransferenciaCrearDTO) {
    return http.post(base, dto);
  },

  // crear pendiente
  async crearPendiente(dto: TransferenciaCrearDTO) {
    return http.post(`${base}/pendiente`, dto);
  },

  // confirmar salida -> en_transito
  async confirmarSalida(id: number) {
    return http.post(`${base}/${id}/salida`);
  },

  // confirmar ingreso -> completada
  async confirmarIngreso(id: number) {
    return http.post(`${base}/${id}/ingreso`);
  },

  // anular (con motivo opcional)
  async anular(id: number, motivo?: string) {
    const p = new URLSearchParams();
    if (motivo) p.set("motivo", motivo);
    return http.post(`${base}/${id}/anular${p.toString() ? `?${p}` : ""}`);
  },

  // detalle
  async detalle(id: number): Promise<TransferenciaDetalleDTO> {
    return http.get(`${base}/${id}`);
  },
};
