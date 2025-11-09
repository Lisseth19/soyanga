// src/servicios/almacen.ts
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type { Almacen, AlmacenCrear, AlmacenActualizar } from "@/types/almacen";

export interface OpcionIdNombre {
  id: number;
  nombre: string;
}

/** DTO de presentaciones visibles en un almacén (alineado al backend) */
export interface PresentacionEnAlmacenDTO {
  idPresentacion: number;
  sku?: string | null;
  producto: string;
  /** Texto libre de la presentación, p.ej. "1 L" (si el backend lo arma) */
  presentacion?: string | null;
  unidad?: string | null;
  stockDisponible: number;
  reservado?: number | null;
  precioBob?: number | null;
  /** campos de lote son opcionales; el backend puede no enviarlos */
  loteNumero?: string | null;
  loteVencimiento?: string | null; // ISO (YYYY-MM-DD)
  loteDisponible?: number | null;
  /** url de imagen de la presentación (si existe en DB) */
  imagenUrl?: string | null;
}

const BASE = "/v1/catalogo/almacenes";

/** Forma que devuelve la API en list/get (cuando no es exactamente Almacen) */
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

/** type guard para decidir si mapear con fromApi */
function isAlmacenAPI(x: any): x is AlmacenAPI {
  return (
      x &&
      typeof x === "object" &&
      "idAlmacen" in x &&
      "nombreAlmacen" in x &&
      "estadoActivo" in x
  );
}

/** Limpia objetos quitando undefined/null/""; admite input opcional */
function clean<T extends Record<string, unknown>>(obj?: T): T | undefined {
  if (!obj) return obj;
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    out[k] = v;
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
  if (
      typeof params.activos === "boolean" &&
      params.soloActivos === undefined &&
      params.incluirInactivos === undefined
  ) {
    if (params.activos) {
      p.soloActivos = true; // activos === true => solo activos
    }
    delete (p as any).activos;
  }

  // si ambos llegan, respetamos incluirInactivos (explícito) y quitamos soloActivos
  if (typeof params.incluirInactivos === "boolean") {
    delete p.soloActivos;
  }

  return clean(p);
}

export const almacenService = {
  /** Listado paginado de almacenes (mapea si viene en forma AlmacenAPI) */
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
    const res = await http.get<Page<AlmacenAPI | Almacen>>(BASE, { params: qp });
    const content = (res.content ?? []).map((item) =>
        isAlmacenAPI(item) ? fromApi(item) : (item as Almacen)
    );
    return { ...res, content } as Page<Almacen>;
  },

  /** Obtener un almacén por id (alias: get / obtener) */
  async obtener(id: number): Promise<Almacen> {
    const data = await http.get<AlmacenAPI | Almacen>(`${BASE}/${id}`);
    return isAlmacenAPI(data) ? fromApi(data) : (data as Almacen);
  },
  get(id: number) {
    return this.obtener(id);
  },

  /** Crear */
  async create(dto: AlmacenCrear): Promise<Almacen> {
    const data = await http.post<AlmacenAPI | Almacen, AlmacenCrear>(BASE, dto);
    return isAlmacenAPI(data) ? fromApi(data) : (data as Almacen);
  },

  /** Actualizar */
  async update(id: number, dto: AlmacenActualizar): Promise<Almacen> {
    const data = await http.put<AlmacenAPI | Almacen, AlmacenActualizar>(
        `${BASE}/${id}`,
        dto
    );
    return isAlmacenAPI(data) ? fromApi(data) : (data as Almacen);
  },

  /** Cambiar estado (PATCH body { activo }) */
  async toggleActivo(id: number, activo: boolean): Promise<void> {
    await http.patch<void, { activo: boolean }>(`${BASE}/${id}/estado`, { activo });
  },

  /** Eliminar */
  async remove(id: number): Promise<void> {
    await http.del<void>(`${BASE}/${id}`);
  },

  /**
   * OPCIONES para combos (id + nombre)
   * - nombre oficial: `opciones(...)`
   * - alias de compatibilidad: `options(...)`
   * - Soporta filtrado por `q` en cliente si el endpoint no lo soporta
   */
  async opciones(params?: {
    incluirInactivos?: boolean;
    soloActivos?: boolean;
    idSucursal?: number;
    q?: string;
  }): Promise<OpcionIdNombre[]> {
    try {
      // Intento 1: endpoint dedicado de opciones
      const baseOpts = await http.get<OpcionIdNombre[]>(`${BASE}/opciones`, {
        params: clean({
          incluirInactivos: params?.incluirInactivos,
          soloActivos: params?.soloActivos,
          idSucursal: params?.idSucursal,
        }),
      });

      if (params?.q) {
        const q = params.q.toLowerCase().trim();
        return baseOpts.filter((o) => o.nombre.toLowerCase().includes(q));
      }
      return baseOpts;
    } catch {
      // Fallback: usa listado y mapea a opciones
      const page = await http.get<Page<AlmacenAPI | Almacen>>(BASE, {
        params: clean({
          q: params?.q, // si el backend lo ignora no afecta
          incluirInactivos: params?.incluirInactivos,
          soloActivos: params?.soloActivos,
          idSucursal: params?.idSucursal,
          page: 0,
          size: 1000,
          sort: "nombreAlmacen,asc",
        }),
      });
      const list = (page.content ?? []).map((a) =>
          isAlmacenAPI(a) ? fromApi(a) : (a as Almacen)
      );
      return list.map((a) => ({ id: a.idAlmacen, nombre: a.nombreAlmacen }));
    }
  },

  // alias en-US / compatibilidad
  options(params?: {
    incluirInactivos?: boolean;
    soloActivos?: boolean;
    idSucursal?: number;
    q?: string;
  }) {
    return this.opciones(params);
  },

  /** Presentaciones/productos de un almacén (paginado) */
  async listarPresentaciones(
      idAlmacen: number,
      params?: {
        q?: string;
        categoriaId?: number;
        soloConStock?: boolean;
        page?: number;
        size?: number;
        /** el backend puede ignorar sort si es native query; no pasa nada */
        sort?: string; // ej. "producto,asc"
        include?: string; // ej. "lotes" (si luego se soporta)
      }
  ): Promise<Page<PresentacionEnAlmacenDTO>> {
    return http.get<Page<PresentacionEnAlmacenDTO>>(
        `${BASE}/${idAlmacen}/presentaciones`,
        { params: clean(params) }
    );
  },
};
