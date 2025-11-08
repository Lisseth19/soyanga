import { useEffect, useMemo, useRef, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import type { AnticipoListado, EstadoAnticipo, Page } from "@/types/anticipos";
import { normalizeEstadoAnticipo } from "@/types/anticipos";
import AnticipoCrearForm from "./AnticipoCrearForm";
import { AplicarAnticipoModal } from "./AplicarAnticipoModal";
import ReservarAnticipoModal from "./ReservarAnticipoModal";
import AnticipoDetalle from "./AnticipoDetalle";
import LiberarReservaModal from "./LiberarReservaModal";
import { CreditCard, Eye, PackagePlus, Unlock } from "lucide-react";

/* ===================== utils ===================== */
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}
const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

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
function fmtFechaSoloDia(iso?: string | number | Date) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ===== type guards ===== */
function isEstadoAnticipo(x: unknown): x is EstadoAnticipo {
    return (
        x === "registrado" ||
        x === "parcialmente_aplicado" ||
        x === "aplicado_total" ||
        x === "anulado" ||
        x === "transferido_a_venta"
    );
}

/* ===================== UI helpers ===================== */
function EstadoChip({ e }: { e: EstadoAnticipo | string }) {
    const key = (isEstadoAnticipo(e) ? e : "registrado") as EstadoAnticipo;
    const map: Record<EstadoAnticipo, string> = {
        registrado: "bg-blue-100 text-blue-700",
        parcialmente_aplicado: "bg-amber-100 text-amber-800",
        aplicado_total: "bg-emerald-100 text-emerald-700",
        anulado: "bg-neutral-200 text-neutral-700",
        transferido_a_venta: "bg-indigo-100 text-indigo-700",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[key]}`}>{String(e).replaceAll("_", " ")}</span>;
}

/* ===================== DateRangePicker (un solo calendario) ===================== */
function DateRangePicker({
                             from,
                             to,
                             onChange,
                         }: {
    from?: string;
    to?: string;
    onChange: (from?: string, to?: string) => void;
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
        const idx = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
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
            <span>Rango de fechas</span>
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
                        <div className="text-sm font-medium">{view.toLocaleDateString("es-BO", { month: "long", year: "numeric" })}</div>
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
                                        className={clsx(
                                            "h-9 rounded relative",
                                            "hover:bg-blue-50",
                                            inRange && "bg-blue-100",
                                            selectedStart || selectedEnd ? "ring-2 ring-blue-500 font-medium" : ""
                                        )}
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

/* ===================== Principal ===================== */
type AplicarCtx = {
    idAnticipo: number;
    idCliente: number;
    clienteNombre?: string;
    saldoAnticipoBob: number;
};

export default function AnticiposListado() {
    // filtros
    const [qNombre, setQNombre] = useState("");
    const [desde, setDesde] = useState<string | undefined>();
    const [hasta, setHasta] = useState<string | undefined>();
    const [estado, setEstado] = useState<EstadoAnticipo | "">("");

    // paginación
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

    // data/estado
    const [data, setData] = useState<Page<AnticipoListado> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // modales
    const [showCrear, setShowCrear] = useState(false);
    const [reservarId, setReservarId] = useState<number | null>(null);
    const [liberarId, setLiberarId] = useState<number | null>(null);

    // modal aplicar (con contexto de cliente)
    const [aplicarCtx, setAplicarCtx] = useState<AplicarCtx | null>(null);

    // detalle (modal)
    const [detalleId, setDetalleId] = useState<number | null>(null);

    async function fetchData() {
        try {
            setLoading(true);
            setErr(null);
            const params: any = { desde, hasta, page, size };
            if (estado) params.estado = String(estado); // <- explícito string
            const res = await anticiposService.listar(params);
            res.content = (res.content ?? []).map((a) => ({
                ...a,
                // en caso que venga string suelto, lo normalizamos y afirmamos el tipo
                estadoAnticipo: normalizeEstadoAnticipo((a as any).estadoAnticipo) as EstadoAnticipo,
                saldoDisponibleBob: Number((a as any).saldoDisponibleBob ?? 0),
                montoBob: Number((a as any).montoBob ?? 0),
                aplicadoAcumuladoBob: Number((a as any).aplicadoAcumuladoBob ?? 0),
            }));
            setData(res);
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || "Error al listar anticipos";
            setErr(msg);
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desde, hasta, page, size, estado]);

    // filtro cliente-side (solo nombre)
    const filas = useMemo(() => {
        const all = data?.content ?? [];
        const q = qNombre.trim().toLowerCase();
        return all.filter((r) => (q ? String(r.cliente ?? "").toLowerCase().includes(q) : true));
    }, [data, qNombre]);

    return (
        <div className="p-4 space-y-4">
            {/* Header + CTA */}
            <div className="flex flex-wrap items-end gap-2">
                <div className="text-xl font-semibold flex-1 min-w-[200px]">Anticipos</div>
                <button
                    onClick={() => setShowCrear(true)}
                    className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"
                >
                    ➕ <span>Nuevo anticipo</span>
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end">
                {/* Buscar por nombre */}
                <div className="flex-1 min-w-[260px]">
                    <label className="block text-xs mb-1">Buscar por nombre de cliente</label>
                    <div className="relative">
                        <input
                            className="w-full border rounded-lg px-3 py-2 pr-10"
                            placeholder="Ej. Juan Pérez"
                            value={qNombre}
                            onChange={(e) => {
                                setQNombre(e.target.value);
                                setPage(0);
                            }}
                        />
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none">
                            <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* Rango de fechas */}
                <div>
                    <label className="block text-xs mb-1">Rango de fechas</label>
                    <DateRangePicker
                        from={desde}
                        to={hasta}
                        onChange={(f, t) => {
                            setDesde(f);
                            setHasta(t);
                            setPage(0);
                        }}
                    />
                </div>

                {/* Estado */}
                <div>
                    <label className="block text-xs mb-1">Estado</label>
                    <select
                        className="border rounded-lg px-3 py-2 w-[220px]"
                        value={estado}
                        onChange={(e) => {
                            const val = (e.target.value || "") as EstadoAnticipo | "";
                            setEstado(val);
                            setPage(0);
                        }}
                    >
                        <option value="">Todos</option>
                        <option value="registrado">Registrado</option>
                        <option value="parcialmente_aplicado">Parcialmente aplicado</option>
                        <option value="aplicado_total">Aplicado total</option>
                        <option value="anulado">Anulado</option>
                        <option value="transferido_a_venta">Transferido a venta</option>
                    </select>
                </div>

                {/* Por página */}
                <div>
                    <label className="block text-xs mb-1">Por página</label>
                    <select
                        className="border rounded-lg px-3 py-2 w-[120px]"
                        value={size}
                        onChange={(e) => {
                            setSize(Number(e.target.value));
                            setPage(0);
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div className="ml-auto">
                    <button className="border rounded-lg px-3 py-2" onClick={fetchData}>
                        Refrescar
                    </button>
                </div>
            </div>

            {err && <div className="text-red-600 text-sm">{err}</div>}
            {loading && <div>Cargando…</div>}

            {/* Cards móvil */}
            <div className="md:hidden space-y-3">
                {filas.map((r) => {
                    const saldo = Number(r.estadoAnticipo === "anulado" ? 0 : r.saldoDisponibleBob ?? 0);
                    const anulado = r.estadoAnticipo === "anulado";
                    const aplicadoTotal = r.estadoAnticipo === "aplicado_total";
                    const tieneCliente = r.idCliente != null;

                    return (
                        <div key={r.idAnticipo} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">ANT{String(r.idAnticipo).padStart(3, "0")}</div>
                                <EstadoChip e={r.estadoAnticipo} />
                            </div>
                            <div className="mt-1 text-sm text-neutral-700">{r.cliente ?? `Cliente #${r.idCliente}`}</div>
                            <div className="mt-1 text-xs text-neutral-500">{fmtFechaSoloDia(r.fechaAnticipo)}</div>
                            <div className="mt-1 text-sm">
                                Monto: <span className="font-medium">{fmtMoney(r.montoBob)} BOB</span>
                            </div>
                            <div className="mt-1 text-sm">Aplicado: {fmtMoney(r.aplicadoAcumuladoBob)} BOB</div>
                            <div className="mt-1 text-sm">
                                Saldo: <span className="font-medium">{fmtMoney(saldo)} BOB</span>
                            </div>
                            {r.observaciones && <div className="mt-1 text-xs text-neutral-600">{r.observaciones}</div>}

                            <div className="mt-3 grid grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDetalleId(r.idAnticipo)}
                                    className="inline-flex items-center justify-center gap-2 px-2 py-2 border rounded text-xs"
                                    title="Ver"
                                >
                                    <Eye size={14} />
                                </button>

                                <button
                                    className="inline-flex items-center justify-center gap-2 px-2 py-2 border rounded text-xs disabled:opacity-50"
                                    onClick={() => setReservarId(r.idAnticipo)}
                                    disabled={anulado}
                                    title="Reservar"
                                >
                                    <PackagePlus size={14} />
                                </button>

                                <button
                                    className="inline-flex items-center justify-center gap-2 px-2 py-2 border rounded text-xs disabled:opacity-50"
                                    onClick={() =>
                                        setAplicarCtx({
                                            idAnticipo: r.idAnticipo,
                                            idCliente: r.idCliente as number,
                                            clienteNombre: (r.cliente ?? undefined) as string | undefined,
                                            saldoAnticipoBob: Number(saldo ?? 0),
                                        })
                                    }
                                    disabled={anulado || aplicadoTotal || !tieneCliente}
                                    title="Aplicar"
                                >
                                    <CreditCard size={14} />
                                </button>

                                <button
                                    className="inline-flex items-center justify-center gap-2 px-2 py-2 border rounded text-xs disabled:opacity-50"
                                    onClick={() => setLiberarId(r.idAnticipo)}
                                    disabled={anulado}
                                    title="Liberar"
                                >
                                    <Unlock size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabla desktop */}
            <div className="hidden md:block border rounded overflow-hidden">
                <div className="w-full overflow-x-auto">
                    <table className="w-full table-fixed text-[12px] lg:text-[11px]">
                        <colgroup>
                            <col className="w-[7%] md:w-[6%] xl:w-[6%]" />
                            <col className="w-[24%] md:w-[22%] xl:w-[20%]" />
                            <col className="w-[16%] md:w-[14%] xl:w-[12%]" />
                            <col className="w-[11%] md:w-[10%] xl:w-[10%]" />
                            <col className="w-[11%] md:w-[10%] xl:w-[10%]" />
                            <col className="w-[11%] md:w-[10%] xl:w-[10%]" />
                            <col className="w-[9%] md:w-[8%] xl:w-[8%]" />
                            <col className="w-[11%] md:w-[12%] xl:w-[10%]" />
                            <col className="w-[24%] md:w-[24%] xl:w-[22%]" />
                        </colgroup>

                        <thead className="bg-gray-50">
                        <tr>
                            <th className="p-2 text-left">N°</th>
                            <th className="p-2 text-left">CLIENTE</th>
                            <th className="p-2 text-left">FECHA</th>
                            <th className="p-2 text-right">MONTO (BOB)</th>
                            <th className="p-2 text-right">APLICADO</th>
                            <th className="p-2 text-right">SALDO (BOB)</th>
                            <th className="p-2 text-center">ESTADO</th>
                            <th className="p-2">OBS.</th>
                            <th className="p-2 text-center">ACCIONES</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filas.map((r) => {
                            const saldo = Number(r.estadoAnticipo === "anulado" ? 0 : r.saldoDisponibleBob ?? 0);
                            const anulado = r.estadoAnticipo === "anulado";
                            const aplicadoTotal = r.estadoAnticipo === "aplicado_total";
                            const tieneCliente = r.idCliente != null;

                            return (
                                <tr key={r.idAnticipo} className="border-t">
                                    <td className="p-2">ANT{String(r.idAnticipo).padStart(3, "0")}</td>
                                    <td className="p-2 truncate">{r.cliente ?? `#${r.idCliente}`}</td>
                                    <td className="p-2 whitespace-nowrap">{fmtFechaSoloDia(r.fechaAnticipo)}</td>
                                    <td className="p-2 text-right">{fmtMoney(r.montoBob)}</td>
                                    <td className="p-2 text-right">{fmtMoney(r.aplicadoAcumuladoBob)}</td>
                                    <td className="p-2 text-right font-medium">{fmtMoney(saldo)}</td>
                                    <td className="p-2 text-center">
                                        <EstadoChip e={r.estadoAnticipo} />
                                    </td>
                                    <td className="p-2 truncate" title={r.observaciones ?? ""}>
                                        {r.observaciones ?? "—"}
                                    </td>

                                    <td className="p-2">
                                        <div className="flex items-center justify-center gap-1.5 lg:gap-2 flex-nowrap whitespace-nowrap overflow-x-auto">
                                            <button
                                                type="button"
                                                onClick={() => setDetalleId(r.idAnticipo)}
                                                className="px-1.5 py-1 rounded border text-[11px] hover:bg-neutral-50"
                                                title="Ver"
                                            >
                                                <Eye size={14} />
                                            </button>

                                            <button
                                                onClick={() => setReservarId(r.idAnticipo)}
                                                disabled={anulado}
                                                className="px-1.5 py-1 rounded border text-[11px] hover:bg-neutral-50 disabled:opacity-50"
                                                title="Reservar"
                                            >
                                                <PackagePlus size={14} />
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setAplicarCtx({
                                                        idAnticipo: r.idAnticipo,
                                                        idCliente: r.idCliente as number,
                                                        clienteNombre: (r.cliente ?? undefined) as string | undefined,
                                                        saldoAnticipoBob: Number(saldo ?? 0),
                                                    })
                                                }
                                                disabled={anulado || aplicadoTotal || !tieneCliente}
                                                className="px-1.5 py-1 rounded border text-[11px] hover:bg-neutral-50 disabled:opacity-50"
                                                title="Aplicar"
                                            >
                                                <CreditCard size={14} />
                                            </button>

                                            <button
                                                onClick={() => setLiberarId(r.idAnticipo)}
                                                disabled={anulado}
                                                className="px-1.5 py-1 rounded border text-[11px] hover:bg-neutral-50 disabled:opacity-50"
                                                title="Liberar"
                                            >
                                                <Unlock size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {(!filas || filas.length === 0) && !loading && (
                            <tr>
                                <td colSpan={9} className="p-4 text-center text-neutral-500">
                                    No hay resultados con los filtros actuales.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-end gap-2">
                <button disabled={page <= 0} onClick={() => setPage((p) => p - 1)} className="border px-2 py-1 rounded disabled:opacity-50">
                    Anterior
                </button>
                <span className="text-xs">Página {page + 1} / {data?.totalPages ?? 1}</span>
                <button
                    disabled={!!data && page >= (data.totalPages || 1) - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="border px-2 py-1 rounded disabled:opacity-50"
                >
                    Siguiente
                </button>
            </div>

            {/* Modal: crear */}
            {showCrear && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-4 w-[420px]">
                        <AnticipoCrearForm
                            onClose={() => setShowCrear(false)}
                            onCreated={() => {
                                setShowCrear(false);
                                fetchData();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Modal: reservar */}
            {reservarId !== null && (
                <ReservarAnticipoModal
                    idAnticipo={reservarId}
                    onClose={() => setReservarId(null)}
                    onDone={() => {
                        setReservarId(null);
                        fetchData();
                    }}
                />
            )}

            {/* Modal: aplicar (con filtro por cliente) */}
            {aplicarCtx && (
                <AplicarAnticipoModal
                    idAnticipo={aplicarCtx.idAnticipo}
                    idCliente={aplicarCtx.idCliente}
                    clienteNombre={aplicarCtx.clienteNombre}
                    saldoAnticipoBob={aplicarCtx.saldoAnticipoBob}
                    onClose={() => setAplicarCtx(null)}
                    onDone={() => {
                        setAplicarCtx(null);
                        fetchData();
                    }}
                />
            )}

            {/* Modal: liberar (parcial) */}
            {liberarId !== null && (
                <LiberarReservaModal
                    idAnticipo={liberarId}
                    onClose={() => setLiberarId(null)}
                    onDone={() => {
                        setLiberarId(null);
                        fetchData();
                    }}
                />
            )}

            {/* Modal: detalle */}
            {detalleId !== null && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-4 w-full max-w-5xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-lg font-semibold">Detalle de anticipo</div>
                            <button type="button" className="px-3 py-1 border rounded hover:bg-neutral-50" onClick={() => setDetalleId(null)}>
                                Cerrar
                            </button>
                        </div>
                        <AnticipoDetalle idAnticipo={detalleId} />
                    </div>
                </div>
            )}
        </div>
    );
}
