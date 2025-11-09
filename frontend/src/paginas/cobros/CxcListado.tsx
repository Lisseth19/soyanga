import { useEffect, useMemo, useState } from "react";
import { cobrosService } from "@/servicios/cobros";
import type { CxcItem, EstadoCuenta, Page } from "@/types/cobros";
import { AplicarPagoModal } from "./AplicarPagoModal";
import VentaDetalle from "@/paginas/ventas/VentaDetalle";
import { Search, Eye, CreditCard } from "lucide-react";
import DateRangePicker from "@/componentes/cxc/DateRangePicker";

/* ==== helpers ==== */
// Evita desfasar un día cuando viene "YYYY-MM-DD"
function parseISOToLocalDate(iso?: string | null): Date | null {
    if (!iso) return null;
    const s = String(iso);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

export default function CxcListado() {
    const [estado, setEstado] = useState<"" | EstadoCuenta>("");
    const [qCliente, setQCliente] = useState<string>("");

    const [emisionDesde, setEmisionDesde] = useState<string | undefined>();
    const [emisionHasta, setEmisionHasta] = useState<string | undefined>();

    const [page, setPage] = useState(0);
    const [size] = useState(20);

    const [data, setData] = useState<Page<CxcItem> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Modal: pago (una CxC)
    const [pagoCuentas, setPagoCuentas] = useState<CxcItem[]>([]);
    const [showPago, setShowPago] = useState(false);

    // Modal: detalle de venta
    const [ventaDetalleId, setVentaDetalleId] = useState<number | null>(null);

    // ==== cargar ====
    async function load() {
        try {
            setLoading(true);
            setErr(null);

            // ✅ Solo filtra "abiertas" (pendiente / parcial) cuando el estado seleccionado es uno de esos.
            // Para "" (Todos), "pagado" y "vencido" mandamos FALSE para que el backend NO filtre.
            const soloAbiertas = estado === "pendiente" || estado === "parcial" ? true : false;

            const res = await cobrosService.listarCxc({
                soloAbiertas,
                emisionDesde,
                emisionHasta,
                page,
                size,
            });

            setData(res);
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo cargar CxC");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estado, emisionDesde, emisionHasta, page, size]);

    // formato fecha
    const fmt = useMemo(
        () =>
            new Intl.DateTimeFormat("es-BO", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }),
        []
    );

    // resaltado de cliente
    function highlightCliente(nombre: string | number | undefined, q: string) {
        const txt = String(nombre ?? "");
        if (!q) return <>{txt || "—"}</>;
        const i = txt.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return <>{txt}</>;
        return (
            <>
                {txt.slice(0, i)}
                <mark className="bg-yellow-100">{txt.slice(i, i + q.length)}</mark>
                {txt.slice(i + q.length)}
            </>
        );
    }

    // client-side: filtro por estado específico y por nombre + orden
    const allRows = useMemo(() => data?.content ?? [], [data]);
    const rows = useMemo(() => {
        let list = allRows;

        if (estado) list = list.filter((r) => r.estadoCuenta === estado);
        if (qCliente.trim()) {
            const q = qCliente.trim().toLowerCase();
            list = list.filter((r) => String(r.cliente ?? "").toLowerCase().includes(q));
        }

        return list
            .slice()
            .sort((a, b) => {
                const da = parseISOToLocalDate(a.fechaEmision)?.getTime() ?? 0;
                const db = parseISOToLocalDate(b.fechaEmision)?.getTime() ?? 0;
                if (db !== da) return db - da; // DESC por fecha
                return (b.idCuentaCobrar ?? 0) - (a.idCuentaCobrar ?? 0); // tie-break DESC
            });
    }, [allRows, estado, qCliente]);

    const totalPendientePagina = useMemo(
        () => rows.reduce((acc, r) => acc + (Number(r.montoPendienteBob) || 0), 0),
        [rows]
    );

    function estadoChip(e: EstadoCuenta) {
        const map: Record<EstadoCuenta, string> = {
            pendiente: "bg-sky-100 text-sky-700",
            parcial: "bg-amber-100 text-amber-800",
            pagado: "bg-emerald-100 text-emerald-700",
            vencido: "bg-rose-100 text-rose-700",
        };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[e]}`}>{e}</span>;
    }

    return (
        <div className="p-4 space-y-4">
            {/* Título + resumen */}
            <div className="flex items-end justify-between gap-3">
                <div>
                    <div className="text-xl font-semibold">Cuentas por Cobrar</div>
                    <div className="text-xs text-neutral-600 mt-0.5">
                        {rows.length} resultado(s) en esta página · Pendiente total: <b>{totalPendientePagina.toFixed(2)} BOB</b>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Estado */}
                <div>
                    <label className="block text-xs mb-1">Estado</label>
                    <select
                        className="border rounded px-3 py-2 w-full"
                        value={estado}
                        onChange={(e) => {
                            setEstado(e.target.value as any);
                            setPage(0);
                        }}
                    >
                        <option value="">Todos</option>
                        {["pendiente", "parcial", "pagado", "vencido"].map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Cliente */}
                <div>
                    <label className="block text-xs mb-1">Cliente</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre…"
                            className="border rounded pl-8 pr-3 py-2 w-full"
                            value={qCliente}
                            onChange={(e) => setQCliente(e.target.value)}
                        />
                    </div>
                </div>

                {/* Rango de fechas (emisión) — el MISMO calendario que en Anticipos */}
                <div className="md:col-span-2">
                    <DateRangePicker
                        from={emisionDesde}
                        to={emisionHasta}
                        onChange={(f, t) => {
                            setEmisionDesde(f);
                            setEmisionHasta(t);
                            setPage(0);
                        }}
                        label="Rango de emisión"
                        buttonWidth="w-full"
                    />
                </div>
            </div>

            {/* Tabla */}
            {err && <div className="text-rose-600 text-sm">{err}</div>}
            {loading && <div className="text-neutral-500">Cargando…</div>}

            {!loading && !err && (
                <div className="border rounded overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50">
                        <tr className="text-left">
                            <th className="px-3 py-2">Venta</th>
                            <th className="px-3 py-2">Cliente</th>
                            <th className="px-3 py-2">Emisión</th>
                            <th className="px-3 py-2">Vencimiento</th>
                            <th className="px-3 py-2 text-right">Pendiente (BOB)</th>
                            <th className="px-3 py-2 text-center">Estado</th>
                            <th className="px-3 py-2 text-center w-[220px]">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r) => {
                            const isPagado = r.estadoCuenta === "pagado" || (r.montoPendienteBob ?? 0) <= 0;
                            const dEmi = parseISOToLocalDate(r.fechaEmision);
                            const dVen = parseISOToLocalDate(r.fechaVencimiento);

                            return (
                                <tr key={r.idCuentaCobrar} className="border-t">
                                    <td className="px-3 py-2">#{r.idVenta}</td>
                                    <td className="px-3 py-2">{highlightCliente(r.cliente ?? r.idCliente, qCliente)}</td>
                                    <td className="px-3 py-2">{dEmi ? fmt.format(dEmi) : "—"}</td>
                                    <td className="px-3 py-2">{dVen ? fmt.format(dVen) : "—"}</td>
                                    <td className="px-3 py-2 text-right">{(r.montoPendienteBob ?? 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-center">{estadoChip(r.estadoCuenta)}</td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="inline-flex gap-2">
                                            <button
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50"
                                                onClick={() => setVentaDetalleId(r.idVenta)}
                                                title="Ver detalle de la venta"
                                            >
                                                <Eye size={14} /> Detalle
                                            </button>
                                            <button
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                                onClick={() => {
                                                    setPagoCuentas([r]);
                                                    setShowPago(true);
                                                }}
                                                disabled={isPagado}
                                                title={isPagado ? "Esta cuenta ya está pagada" : "Aplicar pago"}
                                            >
                                                <CreditCard size={14} /> Aplicar pago
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td className="px-3 py-6 text-neutral-500 text-center" colSpan={7}>
                                    No hay resultados con los filtros actuales.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Paginación */}
            <div className="flex items-center justify-end gap-2">
                <button className="border rounded px-2 py-1" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                </button>
                <span className="text-xs">Página {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}</span>
                <button
                    className="border rounded px-2 py-1"
                    disabled={!data || page + 1 >= (data.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Siguiente
                </button>
            </div>

            {/* Modal: pago */}
            {showPago && (
                <AplicarPagoModal
                    cuentas={pagoCuentas}
                    onClose={() => setShowPago(false)}
                    onDone={() => {
                        setShowPago(false);
                        load();
                    }}
                />
            )}

            {/* Modal: detalle de venta */}
            {ventaDetalleId !== null && <VentaDetalle idVenta={ventaDetalleId} onClose={() => setVentaDetalleId(null)} />}
        </div>
    );
}
