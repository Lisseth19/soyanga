// src/paginas/ventas/VentaNueva.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type {
    VentaCrearDTO,
    CondicionPago,
    MetodoPago,
    TipoDocumentoTributario,
} from "@/types/ventas";
import { almacenService, type OpcionIdNombre } from "@/servicios/almacen";

// Pickers del proyecto
import { ClientePickerDialog, type ClienteLite } from "@/componentes/clientes/ClientePickerDialog";
import { ImpuestoPickerDialog, type ImpuestoLite } from "@/componentes/impuestos/ImpuestoPickerDialog";
import PresentacionesPorAlmacenPicker from "@/componentes/almacenes/PresentacionesPorAlmacenPicker";
import type { PresentacionEnAlmacenDTO } from "@/servicios/almacen";

// NUEVO: servicios para precargar nombres y convertir anticipo
import { ClienteService } from "@/servicios/cliente";
import { presentacionService } from "@/servicios/presentacion";
import { anticiposService } from "@/servicios/anticipos";
import { popVentaDraft } from "@/servicios/ventaDraft";

// Comprobante (ya lo tienes)
import ComprobanteVenta from "@/componentes/ventas/ComprobanteVenta";
import {useSearchParams} from "react-router-dom";

/* ===================== util: fecha simple ===================== */
function toISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}
function fromISODate(s?: string) {
    if (!s) return undefined;
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt;
}
function fmtHuman(d?: string) {
    if (!d) return "";
    const dt = fromISODate(d)!;
    return dt.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ===================== DatePopover (un calendario) ===================== */
function SingleDatePopover({
                               value,
                               onChange,
                               placeholder = "Selecciona fecha",
                           }: {
    value?: string;
    onChange: (v?: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(() => {
        const base = fromISODate(value) || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [selected, setSelected] = useState<Date | undefined>(fromISODate(value));
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ext = fromISODate(value);
        setSelected(ext);
        if (ext) setView(new Date(ext.getFullYear(), ext.getMonth(), 1));
    }, [value]);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!open) return;
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    function daysInMonth(d: Date) {
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    function firstDayIndex(d: Date) {
        const idx = new Date(d.getFullYear(), d.getMonth(), 1).getDay(); // 0=Dom
        return (idx + 6) % 7; // Lunes=0
    }
    function sameDay(a?: Date, b?: Date) {
        if (!a || !b) return false;
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function handlePick(day: Date) {
        setSelected(day);
        const iso = toISODate(day);
        onChange(iso);
        setOpen(false);
    }
    function clear() {
        setSelected(undefined);
        onChange(undefined);
    }

    const weeks: Array<Array<Date | null>> = (() => {
        const res: Array<Array<Date | null>> = [];
        const fIdx = firstDayIndex(view);
        const total = daysInMonth(view);
        let day = 1 - fIdx;
        for (let w = 0; w < 6; w++) {
            const row: Array<Date | null> = [];
            for (let i = 0; i < 7; i++, day++) {
                const thisDate = new Date(view.getFullYear(), view.getMonth(), day);
                if (day < 1 || day > total) row.push(null);
                else row.push(thisDate);
            }
            res.push(row);
        }
        return res;
    })();

    return (
        <div className="relative">
            <button
                type="button"
                className="border rounded-lg px-3 py-1.5 w-[180px] text-left hover:bg-neutral-50 h-8 text-xs"
                onClick={() => setOpen((s) => !s)}
                title="Seleccionar fecha"
            >
                {value ? (
                    <span className="flex items-center gap-2">
            <span>📅</span>
            <span>{fmtHuman(value)}</span>
          </span>
                ) : (
                    <span className="flex items-center gap-2 text-neutral-500">
            <span>📅</span>
            <span>{placeholder}</span>
          </span>
                )}
            </button>

            {open && (
                <div ref={panelRef} className="absolute z-50 mt-2 bg-white border rounded-xl p-3 shadow-lg w-[320px] text-[12px]">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            className="px-2 py-1 rounded hover:bg-neutral-100"
                            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                            title="Mes anterior"
                        >
                            ←
                        </button>
                        <div className="text-xs font-medium">
                            {view.toLocaleDateString("es-BO", { month: "long", year: "numeric" })}
                        </div>
                        <button
                            type="button"
                            className="px-2 py-1 rounded hover:bg-neutral-100"
                            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                            title="Mes siguiente"
                        >
                            →
                        </button>
                    </div>

                    <div className="grid grid-cols-7 text-[11px] mb-1 text-center text-neutral-500">
                        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                            <div key={i} className="py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 text-xs">
                        {weeks.flatMap((row, ri) =>
                            row.map((d, ci) => {
                                if (!d) return <div key={`${ri}-${ci}`} className="h-8 rounded" />;
                                const isSel = sameDay(d, selected);
                                return (
                                    <button
                                        key={`${ri}-${ci}`}
                                        onClick={() => handlePick(d)}
                                        className={[
                                            "h-8 rounded relative hover:bg-blue-50",
                                            isSel ? "bg-blue-100 ring-2 ring-blue-500 font-medium" : "",
                                        ].join(" ")}
                                    >
                                        {d.getDate()}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div className="text-[11px] text-neutral-600">{selected ? fmtHuman(toISODate(selected)) : "—"}</div>
                        <div className="flex gap-2">
                            <button type="button" className="px-2 py-1 text-[11px] border rounded hover:bg-neutral-50" onClick={clear}>
                                Limpiar
                            </button>
                            <button type="button" className="px-2 py-1 text-[11px] border rounded hover:bg-neutral-50" onClick={() => setOpen(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===================== Principal ===================== */
type ItemRow = {
    idPresentacion: number | null;
    sku?: string | null;
    producto?: string | null;
    cantidad: number;
    precioUnitarioBob?: number | null;
    descuentoPorcentaje?: number | null;
    descuentoMontoBob?: number | null;
    imagenUrl?: string | null;

    // 🔴 necesarios para consumir la reserva
    idAlmacenOrigen?: number | null;
    lotes?: Array<{ idLote: number; cantidad: number }>;
};

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VentaNueva({
                                       onClose,
                                       onCreated,
                                   }: {
    onClose?: () => void;
    onCreated?: (idVenta: number) => void;
}) {
    const [sp] = useSearchParams();

    // ===== Combos / datos base =====
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    useEffect(() => {
        almacenService.options().then(setAlmacenes).catch(() => setAlmacenes([]));
    }, []);

    // ===== Estado general =====
    const [idCliente, setIdCliente] = useState<number | null>(null);
    const [clienteNombre, setClienteNombre] = useState<string>("");

    const [tipoDoc, setTipoDoc] = useState<TipoDocumentoTributario>("boleta");
    const [condicion, setCondicion] = useState<CondicionPago>("contado");
    const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
    const [idAlmacen, setIdAlmacen] = useState<number | null>(null);
    const [fechaVenc, setFechaVenc] = useState<string>("");
    const [obs, setObs] = useState<string>("");

    // Impuesto (solo factura)
    const [impuestoSel, setImpuestoSel] = useState<ImpuestoLite | null>(null);
    const [impPickerOpen, setImpPickerOpen] = useState(false);

    // Interés (solo crédito)
    const [interesCredito, setInteresCredito] = useState<string>("");

    // Ítems
    const [items, setItems] = useState<ItemRow[]>([]);

    // Origen anticipo (draft o query param)
    const anticipoCtxRef = useRef<{ idAnticipo: number; aplicarAuto?: boolean } | null>(null);
    const [bannerAnticipo, setBannerAnticipo] = useState<{ idAnticipo: number } | null>(null);

    // Dialogs
    const [cliPickerOpen, setCliPickerOpen] = useState(false);
    const [addFromAlmOpen, setAddFromAlmOpen] = useState(false);
    const [editIdx, setEditIdx] = useState<null | number>(null);

    // N° de documento (preview y luego confirmado al guardar)
    const [docNumero, setDocNumero] = useState<string | null>(null);
    const [docLoading, setDocLoading] = useState(false);

    // Última venta guardada (para mostrar botones de comprobante)
    const [lastVentaId, setLastVentaId] = useState<number | null>(null);

    // Modal de comprobante
    const [compOpen, setCompOpen] = useState(false);
    const compRef = useRef<HTMLDivElement>(null);
    const nextActionRef = useRef<"download" | "print" | null>(null);

    // Pre-visual de numeración
    useEffect(() => {
        let alive = true;
        setDocLoading(true);
        setDocNumero(null);
        ventasService
            .numeracionProximo(tipoDoc)
            .then((r: { numero: string }) => {
                if (alive) setDocNumero(r?.numero ?? null);
            })
            .catch(() => {
                if (alive) setDocNumero(null);
            })
            .finally(() => {
                if (alive) setDocLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [tipoDoc]);

    // Autollenado de fecha e interés según condición
    useEffect(() => {
        if (condicion === "credito" && !fechaVenc) {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            setFechaVenc(d.toISOString().slice(0, 10));
        }
        if (condicion === "contado") {
            setFechaVenc("");
            setInteresCredito("");
        }
    }, [condicion]);

    useEffect(() => {
        if (tipoDoc !== "factura") setImpuestoSel(null);
    }, [tipoDoc]);

    // ====== Cargar borrador desde Anticipo o por ?anticipo=ID ======
    useEffect(() => {
        const draft = popVentaDraft();

        if (draft) {
            if (draft.idCliente) {
                setIdCliente(draft.idCliente);
                // Obtener nombre amigable (si falla, muestra #id)
                ClienteService.obtener(draft.idCliente)
                    .then((c: any) => {
                        const nom =
                            c?.razonSocialONombre ??
                            c?.razonSocial ??
                            c?.nombreCliente ??
                            c?.nombre ??
                            `#${draft.idCliente}`;
                        setClienteNombre(nom);
                    })
                    .catch(() => setClienteNombre(`#${draft.idCliente}`));
            }

            if (draft.idAlmacenDespacho) setIdAlmacen(draft.idAlmacenDespacho);

            if (draft.source?.kind === "anticipo") {
                anticipoCtxRef.current = {
                    idAnticipo: draft.source.idAnticipo,
                    aplicarAuto: draft.source.aplicarAnticipoAuto ?? true,
                };
                setBannerAnticipo({ idAnticipo: draft.source.idAnticipo });
            }

            // Precargar items base (sin nombres/precios)
            const base: ItemRow[] = (draft.items ?? []).map((it) => ({
                idPresentacion: it.idPresentacion,
                cantidad: it.cantidad,
                sku: null,
                producto: null,
                precioUnitarioBob: null,
                descuentoPorcentaje: null,
                descuentoMontoBob: null,
                imagenUrl: null,

                // ⬇️ viene del draft del anticipo
                idAlmacenOrigen: (it as any).idAlmacenOrigen ?? draft.idAlmacenDespacho ?? null,
                lotes: (it as any).lotes ?? undefined,
            }));

            setItems(base);

            // Enriquecer nombres y precios
            (async () => {
                const presIds = Array.from(new Set((draft.items ?? []).map((x) => x.idPresentacion)));
                let priceById: Record<number, number | null> = {};
                if (draft.idAlmacenDespacho) {
                    try {
                        const r: any = await (almacenService as any).listarPresentaciones(draft.idAlmacenDespacho, {
                            page: 0,
                            size: Math.max(200, presIds.length),
                            soloConStock: false,
                        });
                        const list: any[] = r?.content ?? [];
                        for (const it of list) {
                            const pid = Number(it.idPresentacion ?? it.id);
                            const precio = typeof it?.precioBob === "number" ? it.precioBob : null;
                            priceById[pid] = precio;
                        }
                    } catch {
                        /* ignore */
                    }
                }
                const infos = await Promise.all(
                    presIds.map(async (pid) => {
                        try {
                            const p: any = await presentacionService.get(pid);
                            const producto =
                                p?.productoNombre ??
                                p?.nombreProducto ??
                                p?.producto?.nombre ??
                                p?.producto ??
                                null;
                            const present =
                                p?.nombrePresentacion ??
                                p?.presentacionNombre ??
                                p?.presentacion ??
                                p?.textoPresentacion ??
                                null;
                            const sku = p?.codigoSku ?? p?.sku ?? null;
                            const precioBase = Number(p?.precioBob ?? p?.precioVenta ?? p?.precio ?? 0) || 0;
                            const precioFinal = priceById[pid] ?? precioBase;
                            return [pid, { nombre: producto && present ? `${producto} · ${present}` : producto ?? present ?? `Presentación #${pid}`, sku, precio: precioFinal }] as const;
                        } catch {
                            const precioFinal = priceById[pid] ?? 0;
                            return [pid, { nombre: `Presentación #${pid}`, sku: null, precio: precioFinal }] as const;
                        }
                    })
                );
                const map = Object.fromEntries(infos);
                setItems((prev) =>
                    prev.map((row) => {
                        const pid = row.idPresentacion ?? 0;
                        const hit = map[pid];
                        if (!hit) return row;
                        return {
                            ...row,
                            producto: hit.nombre,
                            sku: hit.sku,
                            precioUnitarioBob: hit.precio,
                        };
                    })
                );
            })();
            return;
        }

        // Si no hubo draft, mirar ?anticipo=ID
        const anticipoParam = sp.get("anticipo");
        if (anticipoParam && /^\d+$/.test(anticipoParam)) {
            const idAnticipo = Number(anticipoParam);
            anticipoCtxRef.current = { idAnticipo, aplicarAuto: true };
            setBannerAnticipo({ idAnticipo });
        }

        try {
            const url = new URL(window.location.href);
            const anticipoParam = url.searchParams.get("anticipo");
            if (anticipoParam && /^\d+$/.test(anticipoParam)) {
                const idAnticipo = Number(anticipoParam);
                anticipoCtxRef.current = { idAnticipo, aplicarAuto: true };
                setBannerAnticipo({ idAnticipo });
            }
        } catch { /* noop */ }
    }, [sp]);

    // Si el usuario cambia manualmente el almacén, recalculamos precios por ese almacén
    useEffect(() => {
        (async () => {
            if (!idAlmacen || items.length === 0) return;
            try {
                const r: any = await (almacenService as any).listarPresentaciones(idAlmacen, {
                    page: 0,
                    size: Math.max(200, items.length),
                    soloConStock: false,
                });
                const list: any[] = r?.content ?? [];
                const priceById: Record<number, number | null> = {};
                const labelById: Record<number, { producto?: string | null; sku?: string | null }> = {};
                for (const it of list) {
                    const pid = Number(it.idPresentacion ?? it.id);
                    priceById[pid] = typeof it?.precioBob === "number" ? it.precioBob : null;
                    labelById[pid] = {
                        producto: it?.productoNombre ?? it?.nombreProducto ?? it?.producto ?? null,
                        sku: it?.sku ?? it?.codigoSku ?? null,
                    };
                }
                setItems((prev) =>
                    prev.map((row) => {
                        const pid = row.idPresentacion ?? 0;
                        const p = priceById[pid];
                        const lbl = labelById[pid];
                        return {
                            ...row,
                            precioUnitarioBob: p ?? row.precioUnitarioBob ?? 0,
                            producto: row.producto ?? lbl?.producto ?? row.producto,
                            sku: row.sku ?? lbl?.sku ?? row.sku,
                        };
                    })
                );
            } catch {
                /* ignore */
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idAlmacen]);

    // Helpers ítems
    function setItem(idx: number, patch: Partial<ItemRow>) {
        setItems((arr) => {
            const next = [...arr];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    }
    function removeRow(idx: number) {
        setItems((arr) => arr.filter((_, i) => i !== idx));
    }
    function addFromAlmacen(p: PresentacionEnAlmacenDTO) {
        setItems((arr) => [
            ...arr,
            {
                idPresentacion: p.idPresentacion,
                sku: p.sku ?? null,
                producto: p.producto ?? null,
                cantidad: 1,
                precioUnitarioBob: typeof p.precioBob === "number" ? p.precioBob : null,
                descuentoPorcentaje: null,
                descuentoMontoBob: null,
                imagenUrl: p.imagenUrl ?? null,
            },
        ]);
    }
    function replaceWithFromAlmacen(idx: number, p: PresentacionEnAlmacenDTO) {
        setItem(idx, {
            idPresentacion: p.idPresentacion,
            sku: p.sku ?? null,
            producto: p.producto ?? null,
            precioUnitarioBob: typeof p.precioBob === "number" ? p.precioBob : null,
            imagenUrl: p.imagenUrl ?? null,
        });
    }

    // Limpiar todos los campos (botón "Limpiar")
    function resetForm() {
        setIdCliente(null);
        setClienteNombre("");
        setTipoDoc("boleta");
        setCondicion("contado");
        setMetodo("efectivo");
        setIdAlmacen(null);
        setFechaVenc("");
        setObs("");
        setImpuestoSel(null);
        setInteresCredito("");
        setItems([]);
        setDocNumero(null);
        setLastVentaId(null);
        anticipoCtxRef.current = null;
        setBannerAnticipo(null);
    }

    // ===== Totales (sin descontar anticipo en UI; se aplicará al guardar) =====
    const tot = useMemo(() => {
        let bruto = 0;
        let descTotal = 0;
        for (const it of items) {
            const pu = Number(it.precioUnitarioBob ?? 0) || 0;
            const cant = Number(it.cantidad || 0);
            const linea = pu * cant;
            const dPct = Number(it.descuentoPorcentaje ?? 0) || 0;
            const dMonto = Number(it.descuentoMontoBob ?? 0) || 0;
            const desc = Math.min(linea, Math.max(0, linea * (dPct / 100) + dMonto));
            bruto += linea;
            descTotal += desc;
        }
        const netoBase = Math.max(0, bruto - descTotal);
        const impPct = tipoDoc === "factura" && impuestoSel ? Number(impuestoSel.porcentaje || 0) : 0;
        const impMonto = netoBase * (impPct / 100);
        const conImpuesto = netoBase + impMonto;
        const intPct = condicion === "credito" ? Number(interesCredito || 0) : 0;
        const intMonto = conImpuesto * (intPct / 100);
        const totalNeto = conImpuesto + intMonto;
        return { bruto, descTotal, impPct, impMonto, intPct, intMonto, totalNeto };
    }, [items, tipoDoc, impuestoSel, condicion, interesCredito]);

    // ===== Submit =====
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (items.filter((i) => i.idPresentacion && i.cantidad > 0).length === 0) {
            setErr("Agrega al menos un ítem de venta.");
            return;
        }
        if (!idAlmacen) {
            setErr("Selecciona Almacén de despacho.");
            return;
        }
        if (tipoDoc === "factura") {
            if (!idCliente || idCliente <= 0) {
                setErr("Para facturas, el cliente es obligatorio.");
                return;
            }
            if (!impuestoSel) {
                setErr("Para facturas, debes seleccionar un impuesto.");
                return;
            }
        }
        if (condicion === "credito" && !fechaVenc) {
            setErr("Para crédito, la fecha de vencimiento es obligatoria.");
            return;
        }


        const dto: VentaCrearDTO = {
            idCliente: idCliente ?? undefined,
            tipoDocumentoTributario: tipoDoc,
            condicionDePago: condicion,
            fechaVencimientoCredito: condicion === "credito" ? fechaVenc || null : null,
            idAlmacenDespacho: idAlmacen!,
            metodoDePago: metodo,
            observaciones: obs || null,
            impuestoId: tipoDoc === "factura" ? (impuestoSel?.id ?? null) : null,
            interesCredito:
                condicion === "credito" && interesCredito.trim() !== ""
                    ? Number(interesCredito)
                    : null,

            // ✅ ENVIAR TAMBIÉN idAlmacenOrigen y lotes para consumir la reserva
            items: items
                .filter((it) => it.idPresentacion && it.cantidad > 0)
                .map((it) => {
                    const base: any = {
                        idPresentacion: it.idPresentacion!,
                        cantidad: Number(it.cantidad),
                        precioUnitarioBob: it.precioUnitarioBob ?? undefined,
                        descuentoPorcentaje: it.descuentoPorcentaje ?? undefined,
                        descuentoMontoBob: it.descuentoMontoBob ?? undefined,
                    };
                    if (it.idAlmacenOrigen) base.idAlmacenOrigen = it.idAlmacenOrigen;
                    if (it.lotes && it.lotes.length > 0) {
                        base.lotes = it.lotes.map((l) => ({
                            idLote: l.idLote,
                            cantidad: Number(l.cantidad),
                        }));
                    }
                    return base;
                }),
        };

        try {
            setSaving(true);
            const res = await ventasService.crear(dto);
            const idGenerado = (res as any)?.idVenta as number;
            setLastVentaId(idGenerado ?? null);

            // (opcional) recuperar número definitivo
            try {
                const det: any = await ventasService.detalle(idGenerado);
                const nro = det?.numeroDocumento || det?.header?.numeroDocumento || null;
                if (nro) setDocNumero(nro);
            } catch {}

            // Mantén la conversión/aplicación del anticipo después:
            try {
                const ctx = anticipoCtxRef.current;
                if (ctx?.idAnticipo && (ctx.aplicarAuto ?? true)) {
                    await anticiposService.convertirEnVenta(ctx.idAnticipo, { idVenta: idGenerado });
                }
            } catch (e: any) {
                console.warn("No se pudo convertir/aplicar el anticipo automáticamente:", e?.message || e);
                alert("La venta se creó, pero no se pudo consumir/aplicar el anticipo automáticamente. Puedes hacerlo desde el detalle del anticipo.");
            }

            onCreated?.(idGenerado);
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo crear la venta.");
        } finally {
            setSaving(false);
        }
    }

    // ===== Imprimir / Descargar comprobante =====
    useEffect(() => {
        if (!compOpen || !nextActionRef.current) return;
        const t = setTimeout(async () => {
            if (!compRef.current) return;

            if (nextActionRef.current === "print") {
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write("<html><head><meta charset='utf-8'><title>Comprobante</title>");
                w.document.write("<style>@page{size:A4;margin:12mm;} body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica Neue,Arial}</style>");
                w.document.write("</head><body>");
                w.document.write(compRef.current.outerHTML);
                w.document.write("</body></html>");
                w.document.close();
                w.focus();
                w.print();
            } else {
                try {
                    const html2canvas = (await import("html2canvas")).default;
                    const { jsPDF } = await import("jspdf");
                    const canvas = await html2canvas(compRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
                    const img = canvas.toDataURL("image/png");
                    const pdf = new jsPDF("p", "mm", "a4");
                    const pageW = pdf.internal.pageSize.getWidth();
                    const pageH = pdf.internal.pageSize.getHeight();
                    const imgW = pageW;
                    const imgH = (canvas.height * imgW) / canvas.width;
                    let y = 0;
                    pdf.addImage(img, "PNG", 0, y, imgW, imgH);
                    while (y + imgH > pageH) {
                        pdf.addPage();
                        y -= pageH;
                        pdf.addImage(img, "PNG", 0, y, imgW, imgH);
                    }
                    pdf.save(`comprobante_venta_${lastVentaId ?? ""}.pdf`);
                } catch {
                    alert("Para descargar en PDF necesitas tener instalados 'html2canvas' y 'jspdf'. Puedes usar 'Imprimir' mientras tanto.");
                }
            }
            nextActionRef.current = null;
            setCompOpen(false);
        }, 450);

        return () => clearTimeout(t);
    }, [compOpen, lastVentaId]);

    // === ESTILOS más pequeños ===
    const inputCls =
        "h-8 text-xs border border-neutral-300 rounded-md px-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500";
    const btn = "h-8 px-3 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-xs";
    const btnPri = "h-8 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs";
    const btnOk = "h-8 px-4 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs";

    const showClienteAdvertencia = tipoDoc === "factura" && !idCliente;

    return (
        <div className="bg-white rounded-xl p-4 mx-auto max-w-6xl text-[13px] md:text-[12px]">
            <form onSubmit={onSubmit} className="space-y-3">
                {/* Header simple (sin chips) */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold">Nueva venta</h3>
                        <p className="text-[11px] text-neutral-500">Campos compactos y ordenados.</p>
                    </div>
                </div>

                {/* Banner de origen anticipo */}
                {bannerAnticipo && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-xs">
                        Cargado desde <b>anticipo #{bannerAnticipo.idAnticipo}</b>. Al guardar, se <b>consumirán las reservas</b> y se <b>aplicará el anticipo</b> a esta venta.
                    </div>
                )}

                {err && <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>}

                {/* Datos generales */}
                <section className="rounded-xl border border-neutral-200 p-3">
                    <div className="grid grid-cols-12 gap-2">
                        {/* Tipo de Documento */}
                        <div className="col-span-12 md:col-span-2">
                            <label className="block text-[11px] font-medium mb-1">Tipo de Documento</label>
                            <select className={inputCls} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value as TipoDocumentoTributario)}>
                                <option value="boleta">Boleta</option>
                                <option value="factura">Factura</option>
                            </select>
                        </div>

                        {/* Número (preview → confirmado al guardar) */}
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[11px] font-medium mb-1">N° Documento</label>
                            <input
                                className={inputCls}
                                readOnly
                                value={docLoading ? "Cargando…" : docNumero ?? "—"}
                                placeholder="—"
                                title="Se asigna definitivamente al guardar; puede variar si otra venta se crea antes."
                            />
                            <div className="text-[10px] mt-1 text-neutral-500">Se confirma al guardar.</div>
                        </div>

                        {/* Impuesto (solo factura) */}
                        {tipoDoc === "factura" && (
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[11px] font-medium mb-1">Impuesto</label>
                                <div className="flex gap-2">
                                    <input
                                        className={inputCls}
                                        readOnly
                                        value={impuestoSel ? `${impuestoSel.nombre} (${Number(impuestoSel.porcentaje).toFixed(2)}%)` : ""}
                                        placeholder="Selecciona…"
                                    />
                                    <button type="button" className={btn} onClick={() => setImpPickerOpen(true)}>
                                        Sel.
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Cliente */}
                        <div className="col-span-12 md:col-span-4">
                            <label className="block text-[11px] font-medium mb-1">Cliente</label>
                            <div className="flex gap-2">
                                <input
                                    className={inputCls}
                                    placeholder={tipoDoc === "factura" ? "Escribe o selecciona (obligatorio en factura)..." : "Escribe o selecciona (opcional)"}
                                    value={clienteNombre}
                                    onChange={(e) => {
                                        setClienteNombre(e.target.value); // permite escribir manualmente
                                        setIdCliente(null); // si escribe, se desasocia la selección previa
                                    }}
                                />
                                <button type="button" className={btn} onClick={() => setCliPickerOpen(true)}>
                                    Lista
                                </button>
                            </div>

                            {/* Advertencia cuando es FACTURA y no hay cliente seleccionado */}
                            {showClienteAdvertencia && (
                                <div className="text-[11px] text-rose-600 mt-1">el cliente es obligatorio.</div>
                            )}

                            <div className={`text-[10px] mt-1 ${idCliente ? "text-emerald-700" : "text-neutral-500"}`}>
                                {idCliente ? `Seleccionado (ID: ${idCliente})` : "Sin selección"}
                            </div>
                        </div>

                        {/* Condición */}
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[11px] font-medium mb-1">Condición de Pago</label>
                            <select className={inputCls} value={condicion} onChange={(e) => setCondicion(e.target.value as CondicionPago)}>
                                <option value="contado">Contado</option>
                                <option value="credito">Crédito</option>
                            </select>
                        </div>

                        {/* Fecha Venc. (solo crédito) */}
                        {condicion === "credito" && (
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-[11px] font-medium mb-1">Fecha Venc.</label>
                                <SingleDatePopover value={fechaVenc || undefined} onChange={(v) => setFechaVenc(v || "")} placeholder="Selecciona fecha" />
                            </div>
                        )}

                        {/* Interés (solo crédito) */}
                        {condicion === "credito" && (
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-[11px] font-medium mb-1">Interés (%)</label>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className={inputCls}
                                    placeholder="0.00"
                                    value={interesCredito}
                                    onChange={(e) => setInteresCredito(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Método */}
                        <div className="col-span-12 md:col-span-2">
                            <label className="block text-[11px] font-medium mb-1">Método de Pago</label>
                            <select className={inputCls} value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)}>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="mixto">Mixto</option>
                            </select>
                        </div>

                        {/* Almacén */}
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[11px] font-medium mb-1">Almacén de despacho</label>
                            <select
                                className={inputCls}
                                value={idAlmacen ?? ""}
                                onChange={(e) => setIdAlmacen(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">Seleccione…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Ítems */}
                <section className="rounded-xl border border-neutral-200 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-neutral-700">Ítems</h4>
                        <button type="button" className={btn} onClick={() => setAddFromAlmOpen(true)} disabled={!idAlmacen}>
                            Agregar desde almacén
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border border-neutral-200 rounded-md overflow-hidden">
                            <thead className="bg-neutral-50 text-neutral-600">
                            <tr>
                                <th className="px-3 py-2 text-left border-b">Presentación</th>
                                <th className="px-3 py-2 text-right border-b">Cantidad</th>
                                <th className="px-3 py-2 text-right border-b">P. Unitario</th>
                                <th className="px-3 py-2 text-right border-b">Desc. %</th>
                                <th className="px-3 py-2 text-right border-b">Desc. Bs</th>
                                <th className="px-3 py-2 text-right border-b">Importe</th>
                                <th className="px-3 py-2 text-center border-b">Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                                        Sin ítems. Usa “Agregar desde almacén”.
                                    </td>
                                </tr>
                            ) : (
                                items.map((it, idx) => {
                                    const pu = Number(it.precioUnitarioBob ?? 0) || 0;
                                    const cant = Number(it.cantidad || 0);
                                    const linea = pu * cant;
                                    const dPct = Number(it.descuentoPorcentaje ?? 0) || 0;
                                    const dMonto = Number(it.descuentoMontoBob ?? 0) || 0;
                                    const desc = Math.min(linea, Math.max(0, linea * (dPct / 100) + dMonto));
                                    const importe = Math.max(0, linea - desc);
                                    return (
                                        <tr key={idx} className="even:bg-neutral-50/40">
                                            <td className="px-3 py-2 border-b align-middle">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        className={`${inputCls} h-8`}
                                                        readOnly
                                                        value={
                                                            it.producto
                                                                ? `${it.producto}${it.sku ? " · " + it.sku : ""}`
                                                                : it.idPresentacion
                                                                    ? `Presentación #${it.idPresentacion}`
                                                                    : ""
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className={`${btn} h-8`}
                                                        onClick={() => setEditIdx(idx)}
                                                        disabled={!idAlmacen}
                                                    >
                                                        Cambiar
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 border-b text-right">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    className={`${inputCls} h-8 text-right`}
                                                    value={it.cantidad}
                                                    onChange={(e) => setItem(idx, { cantidad: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className={`${inputCls} h-8 text-right`}
                                                    value={it.precioUnitarioBob ?? ""}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            precioUnitarioBob: e.target.value ? Number(e.target.value) : null,
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className={`${inputCls} h-8 text-right`}
                                                    value={it.descuentoPorcentaje ?? ""}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            descuentoPorcentaje: e.target.value ? Number(e.target.value) : null,
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className={`${inputCls} h-8 text-right`}
                                                    value={it.descuentoMontoBob ?? ""}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            descuentoMontoBob: e.target.value ? Number(e.target.value) : null,
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b text-right whitespace-nowrap">{fmt(importe)}</td>
                                            <td className="px-3 py-2 border-b text-center">
                                                <button
                                                    type="button"
                                                    className={`${btn} h-8 text-rose-600 border-rose-200`}
                                                    onClick={() => removeRow(idx)}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Observaciones + Totales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <section className="rounded-xl border border-neutral-200 p-3">
                            <label className="block text-[11px] font-medium mb-1">Observaciones</label>
                            <textarea className={`${inputCls} min-h-[84px]`} value={obs} onChange={(e) => setObs(e.target.value)} />
                        </section>
                    </div>

                    {/* ==== Totales (sin descontar anticipo en UI) ==== */}
                    <section className="rounded-xl border border-neutral-200 p-3">
                        <div className="text-xs font-semibold mb-2">Totales</div>

                        <div className="flex justify-between py-1 text-xs">
                            <span className="text-neutral-600">Total bruto</span>
                            <span>{fmt(tot.bruto)}</span>
                        </div>

                        <div className="flex justify-between py-1 text-xs">
                            <span className="text-neutral-600">Descuento total</span>
                            <span>- {fmt(tot.descTotal)}</span>
                        </div>

                        <div className="flex justify-between py-1 text-xs">
              <span className="text-neutral-600">
                Impuesto {tot.impPct ? `(${tot.impPct.toFixed(2)}%)` : ""}
              </span>
                            <span>{fmt(tot.impMonto)}</span>
                        </div>

                        {condicion === "credito" && (
                            <div className="flex justify-between py-1 text-xs">
                <span className="text-neutral-600">
                  Interés {tot.intPct ? `(${tot.intPct.toFixed(2)}%)` : ""}
                </span>
                                <span>{fmt(tot.intMonto)}</span>
                            </div>
                        )}

                        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                            <span>Total neto</span>
                            <span className="text-emerald-700">{fmt(tot.totalNeto)}</span>
                        </div>

                        {bannerAnticipo && (
                            <div className="text-[10px] mt-2 text-emerald-700">
                                * El anticipo se aplicará al guardar (se verá reflejado en la CxC y en el detalle de la venta).
                            </div>
                        )}
                    </section>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" className={btn} onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="button" className={btn} onClick={resetForm}>
                        Limpiar
                    </button>

                    {lastVentaId && (
                        <>
                            <button
                                type="button"
                                className={btnOk}
                                onClick={() => {
                                    nextActionRef.current = "download";
                                    setCompOpen(true);
                                }}
                                title="Descargar el comprobante en PDF"
                            >
                                Descargar comprobante
                            </button>
                            <button
                                type="button"
                                className={btnOk}
                                onClick={() => {
                                    nextActionRef.current = "print";
                                    setCompOpen(true);
                                }}
                                title="Imprimir el comprobante"
                            >
                                Imprimir comprobante
                            </button>
                        </>
                    )}

                    <button type="submit" disabled={saving} className={btnPri}>
                        {saving ? "Guardando…" : "Guardar venta"}
                    </button>
                </div>
            </form>

            {/* Dialogs */}
            {cliPickerOpen && (
                <ClientePickerDialog
                    onClose={() => setCliPickerOpen(false)}
                    onPick={(c: ClienteLite) => {
                        setClienteNombre(c.nombre);
                        setIdCliente(c.idCliente);
                        setCliPickerOpen(false);
                    }}
                />
            )}
            {impPickerOpen && (
                <ImpuestoPickerDialog
                    onClose={() => setImpPickerOpen(false)}
                    onPick={(imp: ImpuestoLite) => {
                        setImpuestoSel(imp);
                        setImpPickerOpen(false);
                    }}
                />
            )}
            {addFromAlmOpen && (
                <PresentacionesPorAlmacenPicker
                    idAlmacen={idAlmacen!}
                    abierto={addFromAlmOpen}
                    onClose={() => setAddFromAlmOpen(false)}
                    onPick={(p) => {
                        addFromAlmacen(p);
                        setAddFromAlmOpen(false);
                    }}
                />
            )}
            {editIdx !== null && (
                <PresentacionesPorAlmacenPicker
                    idAlmacen={idAlmacen!}
                    abierto={editIdx !== null}
                    onClose={() => setEditIdx(null)}
                    onPick={(p) => {
                        replaceWithFromAlmacen(editIdx!, p);
                        setEditIdx(null);
                    }}
                />
            )}

            {/* Modal comprobante (preview mínimo) */}
            {compOpen && lastVentaId && (
                <div className="fixed inset-0 z-[1000]">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setCompOpen(false)} />
                    <div className="absolute inset-0 p-4 sm:p-8 flex items-start justify-center overflow-auto">
                        <div className="bg-white rounded-xl w-full max-w-[820px] shadow-2xl border">
                            <div className="p-3 border-b flex items-center justify-between">
                                <h4 className="font-semibold text-sm">Comprobante de venta #{lastVentaId}</h4>
                                <button className={btn} onClick={() => setCompOpen(false)}>Cerrar</button>
                            </div>
                            <div className="p-3">
                                <div ref={compRef}>
                                    <ComprobanteVenta idVenta={lastVentaId} />
                                </div>
                                <div className="mt-3 flex gap-2 justify-end">
                                    <button
                                        className={btnOk}
                                        onClick={() => {
                                            nextActionRef.current = "download";
                                            setCompOpen((s) => s);
                                        }}
                                    >
                                        Descargar PDF
                                    </button>
                                    <button
                                        className={btnOk}
                                        onClick={() => {
                                            nextActionRef.current = "print";
                                            setCompOpen((s) => s);
                                        }}
                                    >
                                        Imprimir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
