// src/servicios/presentacion.ts
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination"; // usa tu tipo de paginación común si ya lo tienes
import type {
  PresentacionDTO,
  PresentacionCrearDTO,
  PresentacionActualizarDTO,
  CodigoBarrasDTO,
  CodigoBarrasCrearDTO,
  PrecioNuevoDTO,
} from "@/types/presentacion";

const BASE = "/v1/catalogo/presentaciones";

function clean(params: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const presentacionService = {
  list(params: {
    idProducto?: number;
    q?: string;
    page?: number;
    size?: number;
    sort?: string;          // ej: "codigoSku,asc"
    soloActivos?: boolean;  // default true
  } = {}): Promise<Page<PresentacionDTO>> {
    const p = {
      idProducto: params.idProducto,
      q: params.q,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort ?? "codigoSku,asc",
      soloActivos: params.soloActivos ?? true,
    };
    return http.get<Page<PresentacionDTO>>(BASE, { params: clean(p) });
  },

  get(id: number): Promise<PresentacionDTO> {
    return http.get<PresentacionDTO>(`${BASE}/${id}`);
  },

  create(dto: PresentacionCrearDTO): Promise<PresentacionDTO> {
    return http.post<PresentacionDTO, PresentacionCrearDTO>(BASE, dto);
  },

  update(id: number, dto: PresentacionActualizarDTO): Promise<PresentacionDTO> {
    return http.put<PresentacionDTO, PresentacionActualizarDTO>(`${BASE}/${id}`, dto);
  },

  // “Eliminar” = desactivar
  deactivate(id: number): Promise<void> {
    return http.del<void>(`${BASE}/${id}`);
  },

  // Códigos de barras (NOTA: el DELETE requiere permiso presentaciones:eliminar en el backend)
  codigos: {
    list(idPresentacion: number): Promise<CodigoBarrasDTO[]> {
      return http.get<CodigoBarrasDTO[]>(`${BASE}/${idPresentacion}/codigos-barras`);
    },
    add(idPresentacion: number, dto: CodigoBarrasCrearDTO): Promise<CodigoBarrasDTO> {
      return http.post<CodigoBarrasDTO, CodigoBarrasCrearDTO>(`${BASE}/${idPresentacion}/codigos-barras`, dto);
    },
    remove(idPresentacion: number, idCodigoBarras: number): Promise<void> {
      return http.del<void>(`${BASE}/${idPresentacion}/codigos-barras/${idCodigoBarras}`);
    },
  },

  // Precios (si ya tienes estos endpoints en backend)
  precios: {
    list(idPresentacion: number, page = 0, size = 20) {
      return http.get<Page<any>>(`${BASE}/${idPresentacion}/precios`, { params: { page, size } });
    },
    vigente(idPresentacion: number) {
      return http.get<any>(`${BASE}/${idPresentacion}/precios/vigente`);
    },
    crear(idPresentacion: number, dto: PrecioNuevoDTO) {
      return http.post<any, PrecioNuevoDTO>(`${BASE}/${idPresentacion}/precios`, dto);
    },
  },

  // Lookup opcional por SKU / código de barras
  lookup(params: { sku?: string; barcode?: string }) {
    return http.get<PresentacionDTO | null>(`${BASE}/lookup`, { params: clean(params) });
  },

  // Imagen de presentación
  subirImagen(idPresentacion: number, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return http.post<PresentacionDTO, FormData>(`${BASE}/${idPresentacion}/imagen`, fd);
  },

  eliminarImagen(idPresentacion: number) {
    return http.del<void>(`${BASE}/${idPresentacion}/imagen`);
  },
};
