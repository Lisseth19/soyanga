// src/servicios/catalogo.ts
import { http, httpPublic } from "./httpClient"; // ← mismo folder que antes
import type { OpcionIdNombre } from "@/types/producto";
import type {
    Page,
    ProductoPublicoResumenDTO,
    ProductoPublicoDetalleDTO,
} from "@/types/catalogo-publico";

/* ============================================================
 * Opciones privadas (como ya tenías)
 * ============================================================ */
export async function getAlmacenesOpciones(activos = true) {
    return http.get<OpcionIdNombre[]>("/v1/almacenes/opciones", {
        params: { activos },
    });
}

/* ============================================================
 * Catálogo PÚBLICO
 * ============================================================ */

type ListarParams = { q?: string; page?: number; size?: number };

/**
 * Lista productos del catálogo público.
 * Backend: GET /v1/catalogo/publico/productos?q=&page=&size=
 * (si usas proxy Vite con /api, también funciona con /api/v1/...)
 */
export function listarProductosPublico(params: ListarParams) {
    return httpPublic.get<Page<ProductoPublicoResumenDTO>>(
        "/v1/catalogo/publico/productos",
        { params }
    );
}

/**
 * Detalle de producto público por ID (con presentaciones activas).
 * Backend: GET /v1/catalogo/publico/producto/{id}
 * Nota: si luego quieres buscar por slug, hay que exponer un endpoint de slug en el backend.
 */
export function obtenerProductoPublico(idProducto: number) {
    return httpPublic.get<ProductoPublicoDetalleDTO>(
        `/v1/catalogo/publico/producto/${idProducto}`
    );
}
