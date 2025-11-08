// src/servicios/ventas.ts
import { http } from "@/servicios/httpClient";
import type {
    Page,
    VentaListado,
    VentaCrearDTO,
    VentaCrearRespuesta,
    VentaDetalleRespuestaDTO,
    VentaTrazabilidadDTO,
    DespachoVentaResp,
    AnulacionVentaResp,
    VentaEstado,
    TipoDocumentoTributario,
    MetodoPago,
} from "@/types/ventas";

export type ListVentasParams = {
    estado?: "" | VentaEstado;
    clienteId?: number;
    desde?: string;
    hasta?: string;
    page?: number;
    size?: number;

    // solo para UI (no se envían al backend)
    tipoDocumento?: "" | TipoDocumentoTributario;
    metodo?: "" | MetodoPago;
};

// ===== Tipos mínimos para comprobante (solo lo que usamos en el front) =====
export interface VentaHeaderMini {
    idVenta: number;
    fechaVenta: string;
    estadoVenta: string;
    tipoDocumentoTributario: "factura" | "boleta";
    numeroDocumento: string;
    idCliente?: number | null;
    cliente?: string | null;
    totalBrutoBob: number;
    descuentoTotalBob: number;
    totalNetoBob: number; // incluye impuesto si es FACTURA
    metodoDePago: string;
    condicionDePago: "contado" | "credito";
    interesCredito?: number | null; // %
    fechaVencimientoCredito?: string | null;
}

export interface VentaItemMini {
    idVentaDetalle: number;
    sku?: string | null;
    producto?: string | null;
    cantidad: number;
    precioUnitarioBob: number;
    subtotalBob: number;
}

function toIsoDateTime(d?: string, isEnd = false) {
    if (!d) return undefined;
    if (d.includes("T")) return d;
    return isEnd ? `${d}T23:59:59` : `${d}T00:00:00`;
}

function clean<T extends Record<string, unknown>>(obj: T): T {
    const out: Record<string, unknown> = {};
    Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined) return;     // 👈 preserva null / "" si tú los envías
        out[k] = v;
    });
    return out as T;
}

const BASE = "/v1/ventas";

export const ventasService = {
    listar(params: ListVentasParams): Promise<Page<VentaListado>> {
        const q = clean({
            estado: params.estado,
            clienteId: params.clienteId,
            desde: toIsoDateTime(params.desde, false),
            hasta: toIsoDateTime(params.hasta, true),
            page: params.page ?? 0,
            size: params.size ?? 20,
        });
        return http.get<Page<VentaListado>>(BASE, { params: q });
    },

    detalle(id: number): Promise<VentaDetalleRespuestaDTO> {
        return http.get<VentaDetalleRespuestaDTO>(`${BASE}/${id}`);
    },

    trazabilidad(id: number): Promise<VentaTrazabilidadDTO> {
        return http.get<VentaTrazabilidadDTO>(`${BASE}/${id}/trazabilidad`);
    },

    crear(dto: VentaCrearDTO): Promise<VentaCrearRespuesta> {
        // importante: enviar nulls explícitos cuando corresponda
        return http.post<VentaCrearRespuesta>(BASE, clean(dto));
    },

    despachar(id: number): Promise<DespachoVentaResp> {
        return http.post<DespachoVentaResp>(`${BASE}/${id}/despachar`);
    },

    anular(id: number, motivo?: string): Promise<AnulacionVentaResp> {
        const params = motivo ? { motivo } : {};
        return http.post<AnulacionVentaResp>(`${BASE}/${id}/anular`, undefined, { params });
    },

    /** Próximo número por tipo (“boleta” | “factura”) */
    numeracionProximo(tipo: TipoDocumentoTributario): Promise<{ numero: string }> {
        // backend: GET /v1/ventas/numeracion/proximo?tipo=boleta|factura
        return http.get<{ numero: string }>(`${BASE}/numeracion/proximo`, { params: { tipo } });
    },

    /** <<< NUEVO >>> Header del comprobante.
     *  Intenta /{id}/header y, si no existe, hace fallback a /{id} y mapea. */
    async header(id: number): Promise<VentaHeaderMini> {
        try {
            return await http.get<VentaHeaderMini>(`${BASE}/${id}/header`);
        } catch {
            const d: any = await http.get<any>(`${BASE}/${id}`);
            const h = d?.header ?? d?.cabecera ?? d ?? {};

            const pick = <T, K extends keyof T>(obj: T, key: K, alt?: any) =>
                (obj?.[key] ?? alt) as T[K];

            const tipo =
                (String(pick(h, "tipoDocumentoTributario", d?.tipoDocumentoTributario ?? "boleta")).toLowerCase() as
                    | "boleta"
                    | "factura");

            const out: VentaHeaderMini = {
                idVenta: Number(pick(h, "idVenta", id)),
                fechaVenta: String(pick(h, "fechaVenta", d?.fechaVenta ?? new Date().toISOString())),
                estadoVenta: String(pick(h, "estadoVenta", d?.estadoVenta ?? "")),
                tipoDocumentoTributario: tipo,
                numeroDocumento: String(pick(h, "numeroDocumento", d?.numeroDocumento ?? "")),
                idCliente: (h as any).idCliente ?? d?.idCliente ?? null,
                cliente: (h as any).cliente ?? d?.cliente ?? d?.clienteNombre ?? null,
                totalBrutoBob: Number((h as any).totalBrutoBob ?? d?.totalBrutoBob ?? 0),
                descuentoTotalBob: Number((h as any).descuentoTotalBob ?? d?.descuentoTotalBob ?? 0),
                totalNetoBob: Number((h as any).totalNetoBob ?? d?.totalNetoBob ?? 0),
                metodoDePago: String((h as any).metodoDePago ?? d?.metodoDePago ?? ""),
                condicionDePago: ((h as any).condicionDePago ?? d?.condicionDePago ?? "contado") as
                    | "contado"
                    | "credito",
                interesCredito:
                    (h as any).interesCredito ?? d?.interesCredito ?? (d?.interesCreditoPct ?? null),
                fechaVencimientoCredito:
                    (h as any).fechaVencimientoCredito ?? d?.fechaVencimientoCredito ?? null,
            };

            return out;
        }
    },

    /** <<< NUEVO >>> Ítems del comprobante.
     *  Intenta /{id}/items y, si no existe, hace fallback a /{id} y mapea. */
    async items(id: number): Promise<VentaItemMini[]> {
        try {
            const res = await http.get<VentaItemMini[] | { content: VentaItemMini[] }>(
                `${BASE}/${id}/items`
            );
            // algunos back devuelven {content:[]}
            const arr = (Array.isArray(res) ? res : (res as any)?.content) ?? [];
            return arr as VentaItemMini[];
        } catch {
            const d: any = await http.get<any>(`${BASE}/${id}`);
            const raw = d?.items ?? d?.detalles ?? d?.detalle ?? [];
            return (raw as any[]).map((it) => ({
                idVentaDetalle: Number(it.idVentaDetalle ?? it.id ?? 0),
                sku: it.sku ?? it.codigoSku ?? null,
                producto: it.producto ?? it.productoNombre ?? it.presentacionNombre ?? null,
                cantidad: Number(it.cantidad ?? it.cant ?? 0),
                precioUnitarioBob: Number(
                    it.precioUnitarioBob ?? it.precio ?? it.precio_unitario ?? 0
                ),
                subtotalBob: Number(it.subtotalBob ?? it.subtotal ?? 0),
            }));
        }
    },

    /** <<< NUEVO >>> Paquete conveniente para ComprobanteVenta:
     *  trae header + items en paralelo. */
    async comprobante(id: number): Promise<{ header: VentaHeaderMini; items: VentaItemMini[] }> {
        const [header, items] = await Promise.all([this.header(id), this.items(id)]);
        return { header, items };
    },
};
