import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type {
  Categoria,
  CategoriaCrearDTO,
  CategoriaEditarDTO,
  OpcionIdNombre,
} from "@/types/categoria";

// Igual que almacenes: tu httpClient ya pone el /api en baseURL/proxy.
// Por eso usamos el mismo base:
const base = "/v1/catalogo/categorias";

function sanitizeParams(params: Record<string, unknown>) {
  // quitamos undefined/null y flags falsos que el backend no necesita
  const p: Record<string, unknown> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    // no envíes soloRaices=false
    if (k === "soloRaices" && v === false) return;
    p[k] = v;
  });
  return p;
}

export const categoriaService = {
  // GET /v1/catalogo/categorias
  async list(params: {
    q?: string;
    idCategoriaPadre?: number | null;
    soloRaices?: boolean;      // true => solo raíces
    page?: number;
    size?: number;
    sort?: string;             // ej: "nombreCategoria,asc"
  }): Promise<Page<Categoria>> {
    return http.get(base, { params: sanitizeParams(params) });
  },

  // GET /v1/catalogo/categorias/{id}
  async get(id: number): Promise<Categoria> {
    return http.get(`${base}/${id}`);
  },

  // POST /v1/catalogo/categorias
  async create(dto: CategoriaCrearDTO): Promise<Categoria> {
    return http.post(base, dto);
  },

  // PUT /v1/catalogo/categorias/{id}
  async update(id: number, dto: CategoriaEditarDTO): Promise<Categoria> {
    return http.put(`${base}/${id}`, dto);
  },

  // DELETE /v1/catalogo/categorias/{id}
  async remove(id: number): Promise<void> {
    return http.del(`${base}/${id}`);
  },

  // GET /v1/catalogo/categorias/opciones
  async options(params?: { q?: string; idCategoriaPadre?: number | null }): Promise<OpcionIdNombre[]> {
    return http.get(`${base}/opciones`, { params: sanitizeParams(params ?? {}) });
  },
};
