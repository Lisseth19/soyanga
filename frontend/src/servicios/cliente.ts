import { http } from "./httpClient";
import type { Page } from "@/types/pagination";
import type {
    Cliente,
    ClienteCrearDTO,
    ClienteEditarDTO,
    ClienteEstadoDTO,
} from "@/types/cliente";

const BASE = "/v1/clientes";

export interface ClientesFiltro {
    q?: string;
    page?: number;
    size?: number;
    soloActivos?: boolean;
    sort?: string;
}

/**
 * Helpers de mapeo -> ajusta si tu backend usa otros nombres:
 * - razonSocialONombre: algunos backends esperan "razonSocial" o "nombreCliente".
 * - limiteCreditoBob: asegúrate de enviar number (no string).
 */
function toBackendCrear(dto: ClienteCrearDTO | any) {
    return {
        // alias comunes: razonSocial, nombreCliente, nombre
        razonSocialONombre: (dto?.razonSocialONombre ?? dto?.razonSocial ?? dto?.nombreCliente ?? dto?.nombre ?? "").trim(),
        nit: dto?.nit?.trim?.() ?? null,
        telefono: dto?.telefono?.trim?.() ?? null,
        correoElectronico: dto?.correoElectronico?.trim?.() ?? null,
        direccion: dto?.direccion?.trim?.() ?? null,
        ciudad: dto?.ciudad?.trim?.() ?? null,
        condicionDePago: dto?.condicionDePago ?? null, // "contado" | "credito"
        limiteCreditoBob:
            dto?.limiteCreditoBob != null && dto?.limiteCreditoBob !== ""
                ? Number(dto.limiteCreditoBob)
                : null,
        estadoActivo: dto?.estadoActivo ?? true,
    };
}

function toBackendEditar(dto: ClienteEditarDTO | any) {
    const base = toBackendCrear(dto);
    // en edición no fuerces estadoActivo si no viene
    if (dto?.estadoActivo === undefined) delete base.estadoActivo;
    return base;
}

export const ClienteService = {
    listar: (params: ClientesFiltro = {}) =>
        http.get<Page<Cliente>>(BASE, {
            params: {
                q: params.q,
                page: params.page ?? 0,
                size: params.size ?? 20,
                soloActivos: params.soloActivos ?? false,
                ...(params.sort ? { sort: params.sort } : {}),
            },
        }),

    obtener: (id: number) => http.get<Cliente>(`${BASE}/${id}`),

    crear: (dto: ClienteCrearDTO) =>
        http.post<Cliente, any>(BASE, toBackendCrear(dto)),

    editar: (id: number, dto: ClienteEditarDTO) =>
        http.put<Cliente, any>(`${BASE}/${id}`, toBackendEditar(dto)),

    eliminar: (id: number) => http.del<void>(`${BASE}/${id}`),

    cambiarEstado: (id: number, dto: ClienteEstadoDTO) =>
        http.patch<Cliente, ClienteEstadoDTO>(`${BASE}/${id}/estado`, dto),
};
