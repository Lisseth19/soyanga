import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type { AuditoriaItem, AuditoriaQuery } from "@/types/auditorias";

const BASE = "/v1/seguridad/auditorias"; // si tu httpClient ya tiene '/api', déjalo así

function clean<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "" && !Number.isNaN(v)) {
      (out as any)[k] = v;
    }
  }
  return out;
}

export async function listarAuditorias(params: AuditoriaQuery) {
  const p = clean(params);
  // Nota: si tu httpClient devuelve { data }, ajusta a: (await http.get<Page<AuditoriaItem>>(BASE, { params: p })).data
  return http.get<Page<AuditoriaItem>>(BASE, { params: p });
}
