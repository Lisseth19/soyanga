import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/presentacion";
import type {
  PresentacionDTO,
  PresentacionCrearDTO,
  PresentacionActualizarDTO,
  CodigoBarrasDTO,
  CodigoBarrasCrearDTO,
  PrecioNuevoDTO,
} from "@/types/presentacion";

const base = "/v1/catalogo/presentaciones";

function clean(params: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    out[k] = v;
  });
  return out;
}

export const presentacionService = {
  list(params: {
    idProducto?: number;
    q?: string;
    page?: number;
    size?: number;
    sort?: string; // "codigoSku,asc"
    soloActivos?: boolean;    
  }): Promise<Page<PresentacionDTO>> {
    return http.get(base, { params: clean(params) });
  },

  get(id: number): Promise<PresentacionDTO> {
    return http.get(`${base}/${id}`);
  },

  create(dto: PresentacionCrearDTO): Promise<PresentacionDTO> {
    return http.post(base, dto);
  },

  update(id: number, dto: PresentacionActualizarDTO): Promise<PresentacionDTO> {
    return http.put(`${base}/${id}`, dto);
  },

  deactivate(id: number): Promise<void> {
    return http.del(`${base}/${id}`);
  },

  // códigos de barras
  codigos: {
    list(idPresentacion: number): Promise<CodigoBarrasDTO[]> {
      return http.get(`${base}/${idPresentacion}/codigos-barras`);
    },
    add(idPresentacion: number, dto: CodigoBarrasCrearDTO): Promise<CodigoBarrasDTO> {
      return http.post(`${base}/${idPresentacion}/codigos-barras`, dto);
    },
    remove(idPresentacion: number, idCodigoBarras: number): Promise<void> {
      return http.del(`${base}/${idPresentacion}/codigos-barras/${idCodigoBarras}`);
    },
  },

  // precios
  precios: {
    list(idPresentacion: number, page=0, size=20) {
      return http.get(`/v1/catalogo/presentaciones/${idPresentacion}/precios`, { params: { page, size }});
    },
    vigente(idPresentacion: number) {
      return http.get(`/v1/catalogo/presentaciones/${idPresentacion}/precios/vigente`);
    },
    crear(idPresentacion: number, dto: PrecioNuevoDTO) {
      return http.post(`/v1/catalogo/presentaciones/${idPresentacion}/precios`, dto);
    },
  },

  // lookup opcional: /lookup?sku=... | ?barcode=...
  lookup(params: { sku?: string; barcode?: string }) {
    return http.get(`${base}/lookup`, { params: clean(params) });
  },

    // imagen de presentación
  subirImagen(idPresentacion: number, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return http.post(`${base}/${idPresentacion}/imagen`, fd);
  },

  eliminarImagen(idPresentacion: number) {
    return http.del(`${base}/${idPresentacion}/imagen`);
  },
};
