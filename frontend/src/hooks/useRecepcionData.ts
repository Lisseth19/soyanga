import { useEffect, useMemo, useState } from "react";
import { comprasService } from "@/servicios/compras";
import { presentacionService } from "@/servicios/presentacion";
import { recepcionesService } from "@/servicios/recepciones";
import { http } from "@/servicios/httpClient"; // ⬅️ para el fallback con idCompra
import type { Compra, CompraDetalle } from "@/types/compras";
import type { PresentacionDTO } from "@/types/presentacion";

export type LineaRecepcion = {
  idCompraDetalle: number;
  idPresentacion: number;
  pedido: number;
  costoOc: number;

  // editables en UI
  cant: number;
  costo: number;
  lote: string;
  fab?: string;
  vence?: string;
  obs?: string;

  // derivados/estado
  recibidoAcum?: number;
  pendiente?: number;
  cerrado?: boolean;
};

function presToLabel(p: Partial<PresentacionDTO>) {
  const parts = [
    p.codigoSku ? String(p.codigoSku).toUpperCase() : null,
    (p as any).nombrePublico || (p as any).nombre || null,
    p.idProducto ? `Prod ${p.idProducto}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || `#${p.idPresentacion}`;
}

// ⬇⬇⬇ Asegura recepciones con ITEMS (intenta ?compraId=, luego ?idCompra=, y si la cabecera no trae items hace GET por id)
const BASE_RECEPCIONES = "/v1/compras/recepciones";
async function fetchRecepcionesConItems(idCompra: number) {
  let recs: any[] = [];

  // 1) Intento normal con ?compraId=
  try {
    const r = await recepcionesService.list(idCompra);
    recs = Array.isArray(r) ? r : [];
  } catch { /* ignore */ }

  // 2) Si vacío, intento con ?idCompra=
  if (!recs.length) {
    try {
      const r = await http.get<any[]>(BASE_RECEPCIONES, { params: { idCompra } });
      recs = Array.isArray(r) ? r : [];
    } catch { /* ignore */ }
  }

  // 3) Garantizar items: para cada cabecera sin items, pedimos el detalle por id
  const full = await Promise.all(
    recs.map(async (r) => {
      const yaTraeItems = Array.isArray(r?.items) && r.items.length > 0;
      const idRecep = r?.idRecepcion ?? r?.id;
      if (yaTraeItems || !idRecep) return r;
      try {
        // GET /v1/compras/recepciones/{id}
        return await recepcionesService.get(idRecep);
      } catch {
        return r; // en peor caso devolvemos la cabecera
      }
    })
  );

  return full;
}

export function useRecepcionData(idCompra: number) {
  const [compra, setCompra] = useState<Compra | null>(null);
  const [lineas, setLineas] = useState<LineaRecepcion[]>([]);
  const [presMap, setPresMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Compra
        const c = await comprasService.obtener(idCompra);
        setCompra(c);

        // 2) Recepciones previas (con ITEMS garantizados)
        const receps = await fetchRecepcionesConItems(idCompra);

        // Acumulador por idCompraDetalle
        type Agg = { qty: number; last?: any };
        const agg = new Map<number, Agg>();

        for (const r of receps ?? []) {
          const estado = String(r?.estadoRecepcion ?? r?.estado ?? "").toLowerCase();
          if (estado === "anulada") continue;

          const items = r?.items ?? r?.detalles ?? r?.detalle ?? [];
          for (const it of items) {
            const detId = it?.idCompraDetalle ?? it?.idDetalle ?? it?.id ?? null;
            if (!detId) continue;

            const qty = Number(it?.cantidadRecibida ?? it?.cantidad ?? 0) || 0;
            const prev = agg.get(detId) || { qty: 0, last: undefined };

            const last = {
              numeroLote: it?.numeroLote ?? it?.lote ?? "",
              fechaFabricacion: it?.fechaFabricacion ?? it?.fab ?? "",
              fechaVencimiento: it?.fechaVencimiento ?? it?.vence ?? "",
              observaciones: it?.observaciones ?? it?.obs ?? "",
              costoUnitarioMoneda: it?.costoUnitarioMoneda ?? it?.costo ?? undefined,
              fechaRecepcion: r?.fechaRecepcion ?? r?.fecha ?? null,
            };
            agg.set(detId, { qty: prev.qty + qty, last });
          }
        }

        // 3) Construir líneas para UI
        const base: LineaRecepcion[] = c.items.map((it: CompraDetalle) => {
          const a = agg.get(it.idCompraDetalle) || { qty: 0, last: undefined };
          const pedido = Number(it.cantidad);
          const recibidoAcum = Number(a.qty || 0);
          const pendiente = Math.max(pedido - recibidoAcum, 0);
          const last = a.last || {};

          return {
            idCompraDetalle: it.idCompraDetalle,
            idPresentacion: it.idPresentacion,
            pedido,
            costoOc: Number(it.costoUnitarioMoneda),

            // Si pendiente=0, la fila quedará bloqueada en la tabla
            cant: pendiente,
            costo: Number(last.costoUnitarioMoneda ?? it.costoUnitarioMoneda),
            lote: String(last.numeroLote ?? ""),
            fab: last.fechaFabricacion || "",
            vence: last.fechaVencimiento || "",
            obs: last.observaciones || "",

            recibidoAcum,
            pendiente,
            cerrado: pendiente <= 0,
          };
        });
        setLineas(base);

        // 4) Labels de presentaciones
        const ids = Array.from(new Set(base.map(b => b.idPresentacion)));
        const labels: Record<number, string> = {};
        await Promise.all(
          ids.map(async pid => {
            try {
              const p = await presentacionService.get(pid);
              labels[pid] = presToLabel(p);
            } catch {
              labels[pid] = `#${pid}`;
            }
          })
        );
        setPresMap(labels);

      } catch (e: any) {
        setError(e.message || "No se pudo cargar datos de recepción");
      } finally {
        setLoading(false);
      }
    })();
  }, [idCompra]);

  const totalRecibir = useMemo(
    () => lineas.reduce((acc, l) => acc + (Number(l.cant) || 0), 0),
    [lineas]
  );

  function setLinea(idx: number, patch: Partial<LineaRecepcion>) {
    setLineas(ls => {
      const next = [...ls];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  return { compra, lineas, setLinea, presMap, loading, error, totalRecibir };
}
