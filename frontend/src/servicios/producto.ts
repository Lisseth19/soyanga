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

// 👇 Helper para activar (cómodo para el toggle)
export function activarProducto(id: number) {
  // Si tu ProductoActualizarDTO YA incluye estadoActivo, esto compila directo.
  // Si no lo incluye, cambia el tipo a Partial<ProductoActualizarDTO & { estadoActivo: boolean }>
  return http.put<ProductoDTO, Partial<ProductoActualizarDTO & { estadoActivo: boolean }>>(
    `${BASE}/${id}`,
    { estadoActivo: true }
  );
}

export function desactivarProducto(id: number) {
  return http.del<void>(`${BASE}/${id}`);
}

// Alias opcional para que la página pueda importar `updateProducto`
export const updateProducto = actualizarProducto;



export async function opcionesProductos(): Promise<Array<{ id: number; nombre: string }>> {
  // Traemos muchos y mapeamos a id/nombre
  const page = await listarProductos({
    q: undefined,
    soloActivos: true,
    page: 0,
    size: 1000,
    sort: "nombreProducto,asc",
  }) as Page<ProductoDTO>;
  return page.content.map(p => ({ id: p.idProducto, nombre: p.nombreProducto }));
}
// (opcional) si implementas /opciones en el backend:
// export function opcionesProducto(q?: string, idCategoria?: number, soloActivos = true) {
//   return http.get<Array<{id:number; nombre:string}>>(`${BASE}/opciones`, { params: { q, idCategoria, soloActivos } });
// }
