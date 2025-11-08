// src/paginas/ventas/VentaListado.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type { Page, VentaListado, VentaEstado } from "@/types/ventas";

// Pickers / Modales
import { ClientePickerDialog, type ClienteLite } from "@/componentes/clientes/ClientePickerDialog";
import VentaNueva from "@/paginas/ventas/VentaNueva";
import VentaDetalle from "@/paginas/ventas/VentaDetalle";
import VentaTrazabilidad from "@/paginas/ventas/VentaTrazabilidad";

/* ===================== utils de fecha (compatibles con Anticipos) ===================== */
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

/* ===================== DateRangePopover (un solo calendario, estilo Anticipos) ===================== */
function DateRangePopover({
                              from,
                              to,
                              onChange,
                              placeholder = "Rango de fechas",
                          }: {
    from?: string;
    to?: string;
    onChange: (from?: string, to?: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(() => {
        const base = fromISODate(from) || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [start, setStart] = useState<Date | undefined>(fromISODate(from));
    const [end, setEnd] = useState<Date | undefined>(fromISODate(to));
    const [hover, setHover] = useState<Date | undefined>(undefined);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const f = fromISODate(from);
        const t = fromISODate(to);
        setStart(f);
        setEnd(t);
        if (f) setView(new Date(f.getFullYear(), f.getMonth(), 1));
    }, [from, to]);

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
    function isBetween(x: Date, a?: Date, b?: Date) {
        if (!a || !b) return false;
        const t = x.getTime();
        const lo = Math.min(a.getTime(), b.getTime());
        const hi = Math.max(a.getTime(), b.getTime());
        return t > lo && t < hi;
    }
    function handlePick(day: Date) {
        if (!start || (start && end)) {
            setStart(day);
            setEnd(undefined);
        } else {
            let a = start;
            let b = day;
            if (b.getTime() < a.getTime()) [a, b] = [b, a];
            setStart(a);
            setEnd(b);
            onChange(toISODate(a), toISODate(b));
            setOpen(false);
        }
    }
    function clear() {
        setStart(undefined);
        setEnd(undefined);
        onChange(undefined, undefined);
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
                className="border rounded-lg px-3 py-2 w-[260px] text-left hover:bg-neutral-50"
                onClick={() => setOpen((s) => !s)}
                title="Seleccionar rango de fechas"
            >
                {from && to ? (
                    <span className="flex items-center gap-2">
            <span>📅</span>
            <span>
              {fmtHuman(from)} — {fmtHuman(to)}
            </span>
          </span>
                ) : (
                    <span className="flex items-center gap-2 text-neutral-500">
            <span>📅</span>
            <span>{placeholder}</span>
          </span>
                )}
            </button>

            {open && (
                <div ref={panelRef} className="absolute z-50 mt-2 bg-white border rounded-xl p-3 shadow-lg w-[320px]">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            className="px-2 py-1 rounded hover:bg-neutral-100"
                            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                            title="Mes anterior"
                        >
                            ←
                        </button>
                        <div className="text-sm font-medium">
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

                    <div className="grid grid-cols-7 text-xs mb-1 text-center text-neutral-500">
                        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                            <div key={i} className="py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 text-sm">
                        {weeks.flatMap((row, ri) =>
                            row.map((d, ci) => {
                                if (!d) return <div key={`${ri}-${ci}`} className="h-9 rounded" />;
                                const selectedStart = sameDay(d, start);
                                const selectedEnd = sameDay(d, end);
                                const hoverEnd = hover && !end ? hover : end;
                                const inRange = isBetween(d, start, hoverEnd || undefined) || selectedStart || selectedEnd;
                                return (
                                    <button
                                        key={`${ri}-${ci}`}
                                        onClick={() => handlePick(d)}
                                        onMouseEnter={() => setHover(d)}
                                        onMouseLeave={() => setHover(undefined)}
                                        className={[
                                            "h-9 rounded relative hover:bg-blue-50",
                                            inRange ? "bg-blue-100" : "",
                                            selectedStart || selectedEnd ? "ring-2 ring-blue-500 font-medium" : "",
                                        ].join(" ")}
                                    >
                                        {d.getDate()}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-neutral-600">
                            {start ? fmtHuman(toISODate(start)) : "—"} {start && "→"} {end ? fmtHuman(toISODate(end)) : "—"}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" className="px-2 py-1 text-xs border rounded hover:bg-neutral-50" onClick={clear}>
                                Limpiar
                            </button>
                            <button type="button" className="px-2 py-1 text-xs border rounded hover:bg-neutral-50" onClick={() => setOpen(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===================== helpers existentes ===================== */
function fmtFechaSoloDia(iso?: string | null) {
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(); // solo fecha
    } catch {
        return iso ?? "-";
    }
}
function fmtMoney(n?: number | null) {
    const v = Number(n ?? 0);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function normalizeTxt(s?: string) {
    return String(s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// === TOTAL PARA LISTADO (no se reduce por pagos)
// 1) Si el backend manda cxcTotalCobrarBob, usarlo (mejor verdad absoluta).
// 2) Si no, calcular base * (1 + interes%) si hay interesCredito.
// 3) Fallback: base (ya incluye impuesto cuando es FACTURA).
function totalNetoConTodo(v: VentaListado) {
    const base = Number(v.totalNetoBob ?? 0);
    if (v.condicionDePago?.toLowerCase() === 'credito') {
        const pct = Number(v.interesCredito ?? 0);
        if (Number.isFinite(pct) && pct > 0) return base * (1 + pct / 100);
    }
    return base;
}

// Badges
function badgeTone(kind: "tipo" | "condicion" | "metodo" | "estado", value?: string) {
    const s = String(value ?? "").toLowerCase();

    if (kind === "tipo") {
        if (s === "factura") return "bg-sky-50 text-sky-700 ring-sky-200";
        if (s === "boleta" || s === "recibo") return "bg-neutral-50 text-neutral-700 ring-neutral-200";
        return "bg-neutral-50 text-neutral-700 ring-neutral-200";
    }
    if (kind === "condicion") {
        if (s === "credito") return "bg-amber-50 text-amber-700 ring-amber-200";
        if (s === "contado") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
        return "bg-neutral-50 text-neutral-700 ring-neutral-200";
    }
    if (kind === "metodo") {
        if (s === "efectivo") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
        if (s === "mixto") return "bg-indigo-50 text-indigo-700 ring-indigo-200";
        if (s === "transferencia") return "bg-slate-50 text-slate-700 ring-slate-200";
        return "bg-neutral-50 text-neutral-700 ring-neutral-200";
    }
    // estado
    if (s === "borrador") return "bg-neutral-50 text-neutral-700 ring-neutral-200";
    if (s === "confirmada") return "bg-sky-50 text-sky-700 ring-sky-200";
    if (s === "despachada") return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    if (s === "anulada") return "bg-rose-50 text-rose-700 ring-rose-200";
    return "bg-neutral-50 text-neutral-700 ring-neutral-200";
}
function Badge({
                   kind,
                   value,
                   children,
               }: {
    kind: "tipo" | "condicion" | "metodo" | "estado";
    value?: string;
    children: React.ReactNode;
}) {
    const tone = badgeTone(kind, value);
    return (
        <span className={`inline-flex items-center rounded-full ring-1 px-2 py-0.5 text-xs font-medium ${tone}`}>
      {children}
    </span>
    );
}

export default function VentasListado() {
    // ====== filtros UI ======
    const [clienteNombre, setClienteNombre] = useState<string>("");
    const [estado, setEstado] = useState<"" | VentaEstado>("");
    // Rango de fecha (con popover)
    const [desde, setDesde] = useState<string>("");
    const [hasta, setHasta] = useState<string>("");
    // Nuevos filtros
    const [tipoDoc, setTipoDoc] = useState<"" | "factura" | "boleta">("");
    const [metodo, setMetodo] = useState<"" | "efectivo" | "credito" | "mixto">("");

    const [size, setSize] = useState<number>(20);

    // ====== datos ======
    const [page, setPage] = useState<number>(0);
    const [data, setData] = useState<Page<VentaListado> | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [err, setErr] = useState<string | null>(null);

    // ====== modales ======
    const [pickerOpen, setPickerOpen] = useState(false);
    const [newOpen, setNewOpen] = useState(false);
    const [detalleOpen, setDetalleOpen] = useState<null | number>(null);
    const [trazaOpen, setTrazaOpen] = useState<null | number>(null);

    // ====== estado de anulación por fila ======
    const [anulandoId, setAnulandoId] = useState<number | null>(null);

    // Build params
    const params = useMemo(() => {
        const effectiveSize = clienteNombre ? Math.max(size, 100) : size;
        return {
            estado: estado || undefined,
            tipoDocumento: tipoDoc || undefined,
            metodo: metodo || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            page,
            size: effectiveSize,
        };
    }, [estado, tipoDoc, metodo, desde, hasta, page, size, clienteNombre]);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const res = await ventasService.listar(params as any);
            setData(res);
        } catch (e: any) {
            setData(null);
            setErr(e?.message || "Error interno del servidor");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    // === Filtrado en front: por nombre, tipoDoc y metodo
    const rows = useMemo(() => {
        const base = data?.content ?? [];
        const term = normalizeTxt(clienteNombre);
        const fil = base.filter((v) => {
            const byNombre = term ? normalizeTxt(v.cliente).includes(term) : true;

            const tipoOk = tipoDoc
                ? normalizeTxt(String(v.tipoDocumentoTributario)) === normalizeTxt(tipoDoc)
                : true;

            const metodoOk = metodo ? normalizeTxt(String((v as any).metodoDePago)) === normalizeTxt(metodo) : true;

            return byNombre && tipoOk && metodoOk;
        });

        return fil.sort((a, b) => {
            const da = new Date(a.fechaVenta || "").getTime() || 0;
            const db = new Date(b.fechaVenta || "").getTime() || 0;
            return db - da;
        });
    }, [data, clienteNombre, tipoDoc, metodo]);

    function aplicarFiltros() {
        setPage(0);
        load();
    }
    function limpiarFiltros() {
        setClienteNombre("");
        setEstado("");
        setDesde("");
        setHasta("");
        setTipoDoc("");
        setMetodo("");
        setPage(0);
    }

    // ====== anular venta ======
    async function anularVenta(id: number) {
        const seguro = confirm(`¿Seguro que deseas anular la venta #${id}?`);
        if (!seguro) return;
        const motivo = prompt("Motivo de anulación (opcional):") ?? undefined;

        try {
            setAnulandoId(id);
            await ventasService.anular(id, motivo && motivo.trim() !== "" ? motivo.trim() : undefined);
            await load();
        } catch (e: any) {
            alert(e?.message || "No se pudo anular la venta.");
        } finally {
            setAnulandoId(null);
        }
    }

    return (
        <div className="p-4 md:p-6">
            {/* Título + acción */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
                <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    onClick={() => setNewOpen(true)}
                >
                    Nueva venta
                </button>
            </div>

            {/* FILTROS */}
            <div className="bg-white border rounded-2xl p-4 shadow-sm mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    {/* Cliente (solo nombre) */}
                    <div className="lg:col-span-2">
                        <label className="text-xs font-medium text-neutral-600">Cliente (nombre)</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Escribe el nombre…"
                                value={clienteNombre}
                                onChange={(e) => {
                                    setClienteNombre(e.target.value);
                                    setPage(0);
                                }}
                            />
                            <button
                                type="button"
                                className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50"
                                onClick={() => setPickerOpen(true)}
                                title="Abrir lista de clientes"
                            >
                                Lista
                            </button>
                        </div>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="text-xs font-medium text-neutral-600">Estado</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={estado}
                            onChange={(e) => {
                                setEstado((e.target.value || "") as "" | VentaEstado);
                                setPage(0);
                            }}
                        >
                            <option value="">Todos</option>
                            <option value="borrador">Borrador</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="despachada">Despachada</option>
                            <option value="anulada">Anulada</option>
                        </select>
                    </div>

                    {/* Rango de fecha con POPOVER */}
                    <div className="lg:col-span-2">
                        <label className="text-xs font-medium text-neutral-600">Rango de fechas</label>
                        <div className="mt-1">
                            <DateRangePopover
                                from={desde || undefined}
                                to={hasta || undefined}
                                onChange={(f, t) => {
                                    setDesde(f || "");
                                    setHasta(t || "");
                                    setPage(0);
                                }}
                            />
                        </div>
                    </div>

                    {/* Tipo de documento */}
                    <div>
                        <label className="text-xs font-medium text-neutral-600">Tipo de documento</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={tipoDoc}
                            onChange={(e) => {
                                setTipoDoc((e.target.value || "") as typeof tipoDoc);
                                setPage(0);
                            }}
                        >
                            <option value="">Todos</option>
                            <option value="factura">Factura</option>
                            <option value="boleta">Boleta</option>
                        </select>
                    </div>

                    {/* Método */}
                    <div>
                        <label className="text-xs font-medium text-neutral-600">Método</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={metodo}
                            onChange={(e) => {
                                setMetodo((e.target.value || "") as typeof metodo);
                                setPage(0);
                            }}
                        >
                            <option value="">Todos</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="credito">Crédito</option>
                            <option value="mixto">Mixto</option>
                        </select>
                    </div>

                    {/* Por página */}
                    <div>
                        <label className="text-xs font-medium text-neutral-600">Por página</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(0);
                            }}
                        >
                            {[10, 20, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <button className="px-3 py-2 border rounded-lg hover:bg-neutral-50" onClick={limpiarFiltros}>
                        Limpiar filtros
                    </button>
                    <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" onClick={aplicarFiltros}>
                        Aplicar
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-neutral-600">
                        <tr>
                            <th className="text-left p-2">Venta #</th>
                            <th className="text-left p-2">Doc.</th>
                            <th className="text-left p-2">Tipo Doc.</th>
                            <th className="text-left p-2">Fecha</th>
                            <th className="text-left p-2">Cliente</th>
                            <th className="text-left p-2">Condición</th>
                            <th className="text-left p-2">Método</th>
                            <th className="text-left p-2">Estado</th>
                            <th className="text-right p-2">Total (Bs)</th>
                            <th className="text-right p-2">Pendiente (Bs)</th>
                            <th className="text-right p-2 w-44">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={11} className="p-4 text-center text-neutral-500">
                                    Cargando…
                                </td>
                            </tr>
                        )}

                        {err && !loading && (
                            <tr>
                                <td colSpan={11} className="p-4 text-center text-rose-600">
                                    {err}
                                </td>
                            </tr>
                        )}

                        {!loading && !err && rows.length === 0 && (
                            <tr>
                                <td colSpan={11} className="p-8 text-center text-neutral-500">
                                    Sin resultados
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            !err &&
                            rows.map((v) => {
                                const isAnulada = String(v.estadoVenta).toLowerCase() === "anulada";
                                const tipo = String(v.tipoDocumentoTributario ?? "-");
                                const condicion = String(v.condicionDePago ?? "-");
                                const metodoV = String((v as any).metodoDePago ?? "-");
                                const estadoV = String(v.estadoVenta ?? "-");

                                return (
                                    <tr key={v.idVenta} className="border-t">
                                        <td className="p-2">{v.idVenta}</td>

                                        {/* Doc. */}
                                        <td className="p-2">{v.numeroDocumento ?? "—"}</td>

                                        {/* Tipo Doc. */}
                                        <td className="p-2">
                                            <Badge kind="tipo" value={tipo}>
                                                {tipo.toUpperCase()}
                                            </Badge>
                                        </td>

                                        {/* Fecha */}
                                        <td className="p-2">{fmtFechaSoloDia(v.fechaVenta)}</td>

                                        {/* Cliente */}
                                        <td className="p-2">{v.cliente ?? "-"}</td>

                                        {/* Condición */}
                                        <td className="p-2">
                                            <Badge kind="condicion" value={condicion}>
                                                {condicion.toLowerCase()}
                                            </Badge>
                                        </td>

                                        {/* Método */}
                                        <td className="p-2">
                                            <Badge kind="metodo" value={metodoV}>
                                                {metodoV.toLowerCase()}
                                            </Badge>
                                        </td>

                                        {/* Estado */}
                                        <td className="p-2">
                                            <Badge kind="estado" value={estadoV}>
                                                {estadoV.toLowerCase()}
                                            </Badge>
                                        </td>

                                        {/* Total = neto + interés (NO varía por pagos) */}
                                        <td className="p-2 text-right font-medium">{fmtMoney(totalNetoConTodo(v))}</td>

                                        {/* Pendiente */}
                                        <td className="p-2 text-right">{fmtMoney((v as any).cxcPendienteBob)}</td>

                                        {/* Acciones */}
                                        <td className="p-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="px-2 py-1 border rounded-lg text-sm hover:bg-neutral-50"
                                                    onClick={() => setDetalleOpen(v.idVenta)}
                                                    title="Ver detalle"
                                                >
                                                    Ver
                                                </button>
                                                <button
                                                    className="px-2 py-1 border rounded-lg text-sm hover:bg-neutral-50"
                                                    onClick={() => setTrazaOpen(v.idVenta)}
                                                    title="Trazabilidad"
                                                >
                                                    Trazabilidad
                                                </button>
                                                <button
                                                    className="px-2 py-1 border rounded-lg text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                                    onClick={() => anularVenta(v.idVenta)}
                                                    disabled={isAnulada || anulandoId === v.idVenta}
                                                    title={isAnulada ? "Ya anulada" : "Anular venta"}
                                                >
                                                    {anulandoId === v.idVenta ? "Anulando…" : "Anular"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center gap-2 p-2">
                    <button
                        className="px-3 py-2 border rounded-lg disabled:opacity-50"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={!data || (data as any).first || loading}
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-neutral-600">
            Página {(data?.number ?? 0) + 1} de {data?.totalPages ?? 1}
          </span>
                    <button
                        className="px-3 py-2 border rounded-lg disabled:opacity-50"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data || (data as any).last || loading}
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            {/* Picker de clientes */}
            {pickerOpen && (
                <ClientePickerDialog
                    onClose={() => setPickerOpen(false)}
                    onPick={(c: ClienteLite) => {
                        setClienteNombre(c.nombre);
                        setPickerOpen(false);
                        setPage(0);
                    }}
                />
            )}

            {/* Modal: Nueva Venta */}
            {newOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto p-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold">Nueva venta</h3>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded-lg hover:bg-neutral-50"
                                onClick={async () => {
                                    setNewOpen(false);
                                    await load(); // refrescar al cerrar
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="pt-3">
                            <VentaNueva
                                onCreated={async () => {
                                    await load();
                                }}
                                onClose={() => setNewOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Detalle */}
            {detalleOpen != null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-auto p-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold">Detalle de venta #{detalleOpen}</h3>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded-lg hover:bg-neutral-50"
                                onClick={() => setDetalleOpen(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="pt-3">
                            <VentaDetalle idVenta={detalleOpen} onClose={() => setDetalleOpen(null)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Trazabilidad */}
            {trazaOpen != null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto p-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold">Trazabilidad de venta #{trazaOpen}</h3>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded-lg hover:bg-neutral-50"
                                onClick={() => setTrazaOpen(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="pt-3">
                            <VentaTrazabilidad idVenta={trazaOpen} onClose={() => setTrazaOpen(null)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
