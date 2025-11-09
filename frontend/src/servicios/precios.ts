// src/servicios/precios.ts
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type {
  ConfigRedondeoDTO,
  ResumenRecalculo,
  PrecioHistoricoDTO,
  FiltroHistoricoDTO,
} from "@/types/precios";
import type { TipoCambioVigente } from "@/types/finanzas";

/* ============== Bases de API (sin /api) ============== */
const BASE_PRECIOS = "/v1/precios";
const BASE_TC = "/v1/finanzas/tipos-cambio";

/* ============== Helpers ============== */
function clean<T extends Record<string, unknown>>(params: T): T {
  const out: Record<string, unknown> = { ...params };
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (v === undefined || v === null || v === "") delete out[k];
  });
  return out as T;
}

/* ============== Servicio ============== */
export const preciosService = {
  /* ---------- Redondeo ---------- */
  getRedondeo: () => http.get<ConfigRedondeoDTO>(`${BASE_PRECIOS}/redondeo`),

  updateRedondeo: (dto: ConfigRedondeoDTO, usuario = "ui") =>
    http.put<ConfigRedondeoDTO, ConfigRedondeoDTO>(`${BASE_PRECIOS}/redondeo`, dto, {
      headers: { "X-Usuario": usuario },
    }),

  /* ---------- Recalcular ---------- */
  recalcular: (
  idMonedaOrigen: number,
  idMonedaDestino: number,
  simular: boolean,
  motivo?: string,
  fechaVigencia?: string // "YYYY-MM-DD"
) =>
  http.post<ResumenRecalculo>(`${BASE_PRECIOS}/recalcular`, undefined, {
    params: clean({ idMonedaOrigen, idMonedaDestino, simular, motivo, fechaVigencia }),
  }),


  /* ---------- Historial ---------- */
  historialPorPresentacion: (idPresentacion: number, page = 0, size = 20) =>
    http.get<Page<PrecioHistoricoDTO>>(
      `${BASE_PRECIOS}/presentaciones/${idPresentacion}/historico`,
      { params: { page, size } }
    ),

  buscarHistorico: (filtro: FiltroHistoricoDTO, page = 0, size = 20) =>
    http.post<Page<PrecioHistoricoDTO>, FiltroHistoricoDTO>(
      `${BASE_PRECIOS}/historico/buscar`,
      filtro,
      { params: { page, size } }
    ),

  /* ---------- Acciones ---------- */
  cambioManual: (
    idPresentacion: number,
    precio: number,
    motivo: string,
    fechaInicioVigencia?: string | null,
    usuario = "ui"
  ) =>
    http.post<void>(
      `${BASE_PRECIOS}/presentaciones/${idPresentacion}/manual`,
      { precioVentaBob: precio, motivoCambio: motivo, fechaInicioVigencia },
      { headers: { "X-Usuario": usuario } }
    ),

  revertir: (idHistorico: number, usuario = "ui") =>
    http.post<void>(`${BASE_PRECIOS}/revertir/${idHistorico}`, undefined, {
      headers: { "X-Usuario": usuario },
    }),

    /* ---------- Tipos de cambio ---------- */
  tcVigente: (idOrigen: number, idDestino: number, fechaVigencia?: string) =>
    http.get<TipoCambioVigente>(`${BASE_TC}/vigente`, {
      params: clean({
        idMonedaOrigen: idOrigen,
        idMonedaDestino: idDestino,
        fechaVigencia, // opcional
      }),
    }),

  crearTC: (dto: { idMonedaOrigen: number; idMonedaDestino: number; fechaVigencia: string; tasaCambio: number }) =>
    http.post(`${BASE_TC}`, dto),
};
