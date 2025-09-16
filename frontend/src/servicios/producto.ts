// src/servicios/producto.ts
import { http } from "./httpClient";
import type { ProductoDTO, ProductoCrearDTO, ProductoActualizarDTO } from '@/types/producto';
import type { Page } from '@/types/pagination'; // si tu tipo se llama distinto, ajusta este import

const BASE = '/v1/catalogo/productos';

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
      sort: params.sort ?? 'nombreProducto,asc',
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

export function desactivarProducto(id: number) {
  // 204 No Content → tu http ya retorna undefined
  return http.del<void>(`${BASE}/${id}`);
}

// (opcional) si implementas /opciones en el backend:
// export function opcionesProducto(q?: string, idCategoria?: number, soloActivos = true) {
//   return http.get<Array<{id:number; nombre:string}>>(`${BASE}/opciones`, { params: { q, idCategoria, soloActivos } });
// }
