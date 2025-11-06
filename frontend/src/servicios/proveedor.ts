// src/servicios/proveedor.ts
import { http } from "./httpClient";
import type { Page } from "@/types/pagination";
import type {
  Proveedor,
  ProveedorCrearDTO,
  ProveedorEditarDTO,
  ProveedorEstadoDTO, // ahora: { activo: boolean }
} from "@/types/proveedor";

const BASE = "/v1/proveedores";

export interface ProveedoresFiltro {
  q?: string;
  page?: number;
  size?: number;
  soloActivos?: boolean;
  // El backend ordena en SQL; si de verdad soportas sort en BE, déjalo.
  sort?: string;
}

/** (Opcional) tipo para combos */
export type ProveedorOpcion = { id: number; nombre: string };

/** Helpers de mapeo hacia backend */
function toBackendCrear(dto: ProveedorCrearDTO | any) {
  return {
    razonSocial: (dto?.razonSocial ?? "").trim(),
    nit: dto?.nit?.trim?.() ?? null,
    contacto: dto?.contacto?.trim?.() ?? null,
    telefono: dto?.telefono?.trim?.() ?? null,
    correoElectronico: dto?.correoElectronico?.trim?.() ?? null,
    direccion: dto?.direccion?.trim?.() ?? null,
    estadoActivo: dto?.estadoActivo ?? true,
  };
}

function toBackendEditar(dto: ProveedorEditarDTO | any) {
  const base = toBackendCrear(dto);
  if (dto?.estadoActivo === undefined) delete base.estadoActivo;
  return base;
}

export const ProveedorService = {
  listar: (params: ProveedoresFiltro = {}) =>
      http.get<Page<Proveedor>>(BASE, {
        params: {
          q: params.q,
          page: params.page ?? 0,
          size: params.size ?? 20,
          soloActivos: params.soloActivos ?? false,
          ...(params.sort ? { sort: params.sort } : {}), // usa solo si BE lo soporta
        },
      }),

  obtener: (id: number) => http.get<Proveedor>(`${BASE}/${id}`),

  crear: (dto: ProveedorCrearDTO) =>
      http.post<Proveedor, any>(BASE, toBackendCrear(dto)),

  editar: (id: number, dto: ProveedorEditarDTO) =>
      http.put<Proveedor, any>(`${BASE}/${id}`, toBackendEditar(dto)),

  eliminar: (id: number) => http.del<void>(`${BASE}/${id}`),

  // PATCH /{id}/estado con body { activo: boolean }
  cambiarEstado: (id: number, dto: ProveedorEstadoDTO) =>
      http.patch<Proveedor, ProveedorEstadoDTO>(`${BASE}/${id}/estado`, dto),

  // Combos: el backend expone /opciones con q y size
  opciones: (params?: { q?: string; size?: number }) =>
      http.get<ProveedorOpcion[]>(`${BASE}/opciones`, {
        params: {
          q: params?.q,
          size: params?.size ?? 1000,
        },
      }),
};

/* ====== Exports nombrados para compatibilidad ====== */
export const listarProveedores = (params?: ProveedoresFiltro) =>
    ProveedorService.listar(params);

export const obtenerProveedor = (id: number) =>
    ProveedorService.obtener(id);

export const crearProveedor = (dto: ProveedorCrearDTO) =>
    ProveedorService.crear(dto);

export const actualizarProveedor = (id: number, dto: ProveedorEditarDTO) =>
    ProveedorService.editar(id, dto);

export const eliminarProveedor = (id: number) =>
    ProveedorService.eliminar(id);

// Conveniencia: acepta boolean y arma { activo }
export const cambiarEstadoProveedor = (id: number, activo: boolean) =>
    ProveedorService.cambiarEstado(id, { activo });

// (Opcional) mantener nombre alterno
export const opcionesProveedores = (params?: { q?: string; size?: number }) =>
    ProveedorService.opciones(params);
