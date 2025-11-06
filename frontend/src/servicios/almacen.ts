// src/servicios/almacen.ts
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type { Almacen, AlmacenCrear, AlmacenActualizar } from "@/types/almacen";

export interface OpcionIdNombre {
  id: number;
  nombre: string;
}

const BASE = "/v1/catalogo/almacenes";

/** Forma que devuelve la API en list/get */
type AlmacenAPI = {
  idAlmacen: number;
  idSucursal: number;
  nombreAlmacen: string;
  descripcion?: string | null;
  estadoActivo: boolean;
  sucursal?: string | null;
};

const fromApi = (a: AlmacenAPI): Almacen => ({
  idAlmacen: a.idAlmacen,
  idSucursal: a.idSucursal,
  nombreAlmacen: a.nombreAlmacen,
  descripcion: a.descripcion ?? "",
  estadoActivo: a.estadoActivo,
});

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (v === undefined || v === null || v === "") delete out[k];
  });
  return out as T;
}

/**
 * Normaliza filtros para el backend:
 * - Backend usa incluirInactivos (true = todos, false/omitido = solo activos)
 * - También acepta soloActivos=true (equivale a incluirInactivos=false)
 * - Si alguna pantalla antigua manda `activos: true`, mandamos `soloActivos: true`.
 */
function normalizeListParams(params: {
  q?: string;
  idSucursal?: number;
  incluirInactivos?: boolean;
  soloActivos?: boolean;
  activos?: boolean; // legacy (si viene de pantallas antiguas)
  page?: number;
  size?: number;
  sort?: string;
}) {
  const p: Record<string, unknown> = { ...params };

  // mapear "activos" legacy
  if (typeof params.activos === "boolean" && params.soloActivos === undefined && params.incluirInactivos === undefined) {
    // activos === true => solo activos
    if (params.activos) {
      p.soloActivos = true;
    }
    // activos === false (solo inactivos) no está soportado por este endpoint; dejamos sin mandar nada especial.
    delete p.activos;
  }

  // si ambos llegan, respetamos incluirInactivos (explícito) y quitamos soloActivos
  if (typeof params.incluirInactivos === "boolean") {
    delete p.soloActivos;
  }

  return clean(p);
}

export const almacenService = {
  // LISTAR
  async list(params: {
    q?: string;
    idSucursal?: number;
    incluirInactivos?: boolean;
    soloActivos?: boolean;
    activos?: boolean; // legacy
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<Page<Almacen>> {
    const qp = normalizeListParams(params);
    const res = await http.get<Page<AlmacenAPI>>(BASE, { params: qp });
    return { ...res, content: (res.content ?? []).map(fromApi) } as Page<Almacen>;
  },

  // OBTENER
  get: (id: number) => http.get<AlmacenAPI>(`${BASE}/${id}`).then(fromApi),

  // CREAR
  create: (dto: AlmacenCrear) =>
      http.post<AlmacenAPI, AlmacenCrear>(BASE, dto).then(fromApi),

  // ACTUALIZAR
  update: (id: number, dto: AlmacenActualizar) =>
      http.put<AlmacenAPI, AlmacenActualizar>(`${BASE}/${id}`, dto).then(fromApi),

  // CAMBIAR ESTADO (PATCH body { activo })
  toggleActivo: (id: number, activo: boolean) =>
      http.patch<void, { activo: boolean }>(`${BASE}/${id}/estado`, { activo }),

  // ELIMINAR
  remove: (id: number) => http.del<void>(`${BASE}/${id}`),

  /**
   * OPCIONES para combos (id + nombre)
   * - nombre oficial: `opciones(...)`
   * - alias de compatibilidad: `options(...)`
   */
  opciones: async (params?: { incluirInactivos?: boolean; soloActivos?: boolean; idSucursal?: number; q?: string }) => {
    try {
      // Llama al endpoint oficial del backend
      const baseOpts = await http.get<OpcionIdNombre[]>(`${BASE}/opciones`, {
        params: clean({
          incluirInactivos: params?.incluirInactivos,
          soloActivos: params?.soloActivos,
          idSucursal: params?.idSucursal,
        }),
      });

      // Si viene `q`, filtramos en cliente (el endpoint no soporta q)
      if (params?.q) {
        const q = params.q.toLowerCase().trim();
        return baseOpts.filter((o) => o.nombre.toLowerCase().includes(q));
      }
      return baseOpts;
    } catch (e: any) {
      // Fallback si /opciones no existiera (o por compatibilidad)
      const page = await http.get<Page<AlmacenAPI>>(BASE, {
        params: clean({
          q: params?.q,
          incluirInactivos: params?.incluirInactivos,
          soloActivos: params?.soloActivos,
          idSucursal: params?.idSucursal,
          page: 0,
          size: 1000,
          sort: "nombreAlmacen,asc",
        }),
      });
      return (page.content ?? []).map((a) => ({ id: a.idAlmacen, nombre: a.nombreAlmacen } as OpcionIdNombre));
    }
  },

  // alias en-US para pantallas antiguas
  options: (params?: { incluirInactivos?: boolean; soloActivos?: boolean; idSucursal?: number; q?: string }) =>
      almacenService.opciones(params),
};
