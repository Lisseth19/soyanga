// src/servicios/impuestos.ts
import { http } from "@/servicios/httpClient";
import type { Impuesto, ImpuestoCrearDTO, ImpuestoEditarDTO, ImpuestosListarParams, Page } from "@/types/impuestos";

const BASE = "/v1/impuestos";

function clean<T extends Record<string, unknown>>(obj: T): T {
    const out: Record<string, unknown> = {};
    Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        out[k] = v;
    });
    return out as T;
}

export const impuestosService = {
    listar(params: ImpuestosListarParams = {}): Promise<Page<Impuesto>> {
        const q = clean({
            q: params.q,
            soloActivos: params.soloActivos ?? false,
            page: params.page ?? 0,
            size: params.size ?? 20,
        });
        return http.get<Page<Impuesto>>(BASE, { params: q });
    },

    obtener(id: number): Promise<Impuesto> {
        return http.get<Impuesto>(`${BASE}/${id}`);
    },

    crear(dto: ImpuestoCrearDTO): Promise<Impuesto> {
        return http.post<Impuesto>(BASE, dto);
    },

    editar(id: number, dto: ImpuestoEditarDTO): Promise<Impuesto> {
        return http.put<Impuesto>(`${BASE}/${id}`, dto);
    },

    eliminar(id: number): Promise<void> {
        return http.del<void>(`${BASE}/${id}`);
    },

    activar(id: number): Promise<Impuesto> {
        // si tu httpClient NO tiene .patch, cambia el backend a aceptar POST o agrega http.patch
        return http.patch<Impuesto>(`${BASE}/${id}/activar`);
    },

    desactivar(id: number): Promise<Impuesto> {
        return http.patch<Impuesto>(`${BASE}/${id}/desactivar`);
    },
};
