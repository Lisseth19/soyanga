// servicios/alertas.ts
import { http } from '@/servicios/httpClient';
import type { Page } from '@/types/pagination';
import type { AlertaItem, AlertasQuery, AlertasResumen } from '@/types/alertas';

function sanitize<T extends object>(obj: T): Partial<T> {
  const out = {} as Partial<T>;
  // casteamos solo para poder iterar con Object.entries
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    (out as any)[k] = v;
  }
  return out;
}

const base = '/v1/inventario/alertas';

export const alertasService = {
  list(params: AlertasQuery): Promise<Page<AlertaItem>> {
    return http.get(base, { params: sanitize(params) });
  },
   // NUEVO
  resumen(params?: Partial<AlertasQuery> & { top?: number }): Promise<AlertasResumen> {
    return http.get(`${base}/resumen`, { params: sanitize(params ?? {}) });
  },
};
