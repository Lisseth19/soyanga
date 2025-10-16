// 2) SERVICIO — src/servicios/compras.ts

import type { Compra, CompraCrearDTO, CompraDetalleCrearDTO, CompraEstado, Page } from "@/types/compras";

//-------------------------------------------------
const API = '/api/v1/compras';

export type ListComprasParams = {
  estado?: CompraEstado | '';
  proveedorId?: number;
  desde?: string; // ISO datetime
  hasta?: string; // ISO datetime
  page?: number;
  size?: number;
};

function toIsoDateTime(d?: string, isEnd = false) {
  if (!d) return undefined;
  // si ya viene con "T", la dejamos tal cual
  if (d.includes('T')) return d;
  return isEnd ? `${d}T23:59:59` : `${d}T00:00:00`;
}

export const comprasService = {
  async listar(params: ListComprasParams): Promise<Page<any>> {
    // normaliza fechas a LocalDateTime ISO
    const final: Record<string, unknown> = {
      ...params,
      desde: toIsoDateTime(params.desde, false),
      hasta: toIsoDateTime(params.hasta, true),
    };

    const url = new URL(API, window.location.origin);
    Object.entries(final).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });

    const r = await fetch(url.toString());
    if (!r.ok) throw new Error('No se pudo listar compras');
    return r.json();
  },
  async obtener(id: number): Promise<Compra> {
    const r = await fetch(`${API}/${id}`);
    if (!r.ok) throw new Error('Compra no encontrada');
    return r.json();
  },
  async crear(dto: CompraCrearDTO): Promise<Compra> {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!r.ok) throw new Error('No se pudo crear la compra');
    return r.json();
  },
  async agregarItem(id: number, dto: CompraDetalleCrearDTO) {
    const r = await fetch(`${API}/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!r.ok) throw new Error('No se pudo agregar el ítem');
    return r.json();
  },
  // ✅ PUT con fetch y JSON body
  async actualizarItem(
    idCompra: number,
    idDetalle: number,
    dto: { cantidad?: number; costoUnitarioMoneda?: number; fechaEstimadaRecepcion?: string | null }
  ) {
    const r = await fetch(`${API}/${idCompra}/items/${idDetalle}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!r.ok) throw new Error('No se pudo actualizar el ítem');
    return r.json(); // devuelve el detalle actualizado (o lo que retorne tu API)
  },

  // ✅ DELETE con fetch
  async eliminarItem(idCompra: number, idDetalle: number) {
    const r = await fetch(`${API}/${idCompra}/items/${idDetalle}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('No se pudo eliminar el ítem');
    // tu endpoint probablemente devuelve 204; no hay JSON que leer
    return;
  },

  async cambiarEstado(id: number, nuevo: CompraEstado) {
    const r = await fetch(`${API}/${id}/estado?nuevo=${encodeURIComponent(nuevo)}`, { method: 'POST' });
    if (!r.ok) throw new Error('No se pudo cambiar el estado');
    return r.json();
  },
  async aprobar(id: number) {
    const r = await fetch(`${API}/${id}/aprobar`, { method: 'POST' });
    if (!r.ok) throw new Error('No se pudo aprobar la compra');
    return r.json();
  },
  async anular(id: number, motivo?: string) {
    const url = new URL(`${API}/${id}/anular`, window.location.origin);
    if (motivo) url.searchParams.set('motivo', motivo);
    const r = await fetch(url.toString(), { method: 'POST' });
    if (!r.ok) throw new Error('No se pudo anular la compra');
    return r.json();
  },

};