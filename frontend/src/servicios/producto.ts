// src/servicios/producto.ts
import { http } from "./httpClient";
import type {
  ProductoDTO,
  ProductoCrearDTO,
  ProductoActualizarDTO,
} from "@/types/producto";
import type { Page } from "@/types/pagination"; // ajusta si tu tipo se llama distinto

// IMPORTANTE: tu httpClient probablemente ya prefija "/api"
// Por eso mantenemos este BASE como "/v1/..." para que resulte en "/api/v1/..."
const BASE = "/v1/catalogo/productos";

export function listarProductos(params: {
  q?: string;
  idCategoria?: number;
  soloActivos?: boolean;
  page?: number;
  size?: number;
  sort?: string; // ej: 'nombreProducto,asc'
} = {}) {
  return http.get<Page<ProductoDTO>>(BASE, {
    params: {
      q: params.q,
      idCategoria: params.idCategoria,
      soloActivos: params.soloActivos ?? false,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort ?? "nombreProducto,asc",
    },
  });
}

export function obtenerProducto(id: number) {
  return http.get<ProductoDTO>(`${BASE}/${id}`);
}

export function crearProducto(dto: ProductoCrearDTO) {
  return http.post<ProductoDTO, ProductoCrearDTO>(BASE, dto);
}

export function actualizarProducto(id: number, dto: ProductoActualizarDTO) {
  return http.put<ProductoDTO, ProductoActualizarDTO>(`${BASE}/${id}`, dto);
}

/** Activar (soft on): usa PUT con estadoActivo=true */
export function activarProducto(id: number) {
  // Si ProductoActualizarDTO no incluye estadoActivo, cambia el tipo del body a Partial<{ estadoActivo: boolean } & ProductoActualizarDTO>
  return http.put<
      ProductoDTO,
      Partial<ProductoActualizarDTO & { estadoActivo: boolean }>
  >(`${BASE}/${id}`, { estadoActivo: true });
}

/** Desactivar (soft off): ahora es PATCH /{id}/desactivar */
export function desactivarProducto(id: number) {
  return http.patch<void, Record<string, never>>(
      `${BASE}/${id}/desactivar`,
      {}
  );
}

/** Eliminar (hard delete): solo permitido si NO tiene presentaciones */
export function eliminarProducto(id: number) {
  return http.del<void>(`${BASE}/${id}`);
}

// Alias opcional para compatibilidad en componentes que importan updateProducto
export const updateProducto = actualizarProducto;

/** Opciones de productos activos (para combos, etc.) */
export async function opcionesProductos(): Promise<
    Array<{ id: number; nombre: string }>
> {
  const page = await listarProductos({
    q: undefined,
    soloActivos: true,
    page: 0,
    size: 1000,
    sort: "nombreProducto,asc",
  });
  return (page.content ?? []).map((p) => ({
    id: p.idProducto,
    nombre: p.nombreProducto,
  }));
}

// (opcional) si implementas /opciones en el backend:
// export function opcionesProducto(q?: string, idCategoria?: number, soloActivos = true) {
//   return http.get<Array<{ id: number; nombre: string }>>(`${BASE}/opciones`, { params: { q, idCategoria, soloActivos } });
// }
