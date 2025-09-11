import { http } from "./http";

export type SortDir = "asc" | "desc";

export interface Moneda {
    id: number;
    codigo: string;
    nombre: string;
    esLocal: boolean;
    estadoActivo: boolean;
    tasaCambioRespectoLocal?: number | null; // la envía el backend para NO locales
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
}

export interface MonedaQuery {
    q?: string;
    activos?: boolean;
    page?: number;  // 0-based
    size?: number;
    sort?: string;  // ej. "nombreMoneda,asc"
}

export async function listarMonedas(params: MonedaQuery) {
    const { data } = await http.get<Page<Moneda>>("/api/v1/catalogo/monedas", { params });
    return data;
}

export interface MonedaCrear {
    codigo: string;
    nombre: string;
    esLocal: boolean;
    tasaCambioRespectoLocal?: number;
    // fechaVigencia?: string; // si más adelante quieres permitir fecha al crear
}

export interface MonedaActualizar {
    codigo: string;
    nombre: string;
    esLocal: boolean;
    estadoActivo: boolean;
    // NUEVO: permitir editar TC cuando no es local
    tasaCambioRespectoLocal?: number;
    // fechaVigencia?: string; // opcional si agregas date en el form de edición
}

export async function crearMoneda(dto: MonedaCrear) {
    const { data } = await http.post<Moneda>("/api/v1/catalogo/monedas", dto);
    return data;
}

export async function actualizarMoneda(id: number, dto: MonedaActualizar) {
    const { data } = await http.put<Moneda>(`/api/v1/catalogo/monedas/${id}`, dto);
    return data;
}

export async function eliminarMoneda(id: number) {
    // backend hace "soft delete" (inhabilitar) salvo que quieras borrar físico.
    await http.delete<void>(`/api/v1/catalogo/monedas/${id}`);
}

export async function cambiarEstado(id: number, activo: boolean) {
    const { data } = await http.patch<Moneda>(
        `/api/v1/catalogo/monedas/${id}/estado`,
        null,
        { params: { activo } }
    );
    return data;
}
