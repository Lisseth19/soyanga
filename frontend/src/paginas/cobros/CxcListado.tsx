// src/paginas/cobros/CxcListado.tsx
import { useEffect, useMemo, useState } from "react";
import { cobrosService } from "@/servicios/cobros";
import type { CxcItem, EstadoCuenta, Page, CxcDetalleDTO } from "@/types/cobros";
import { AplicarPagoModal } from "./AplicarPagoModal";
import VentaDetalle from "@/paginas/ventas/VentaDetalle";
import CxcPanelDetalle from "@/paginas/cobros/CxcPanelDetalle";
import { Search, Eye, CreditCard, History } from "lucide-react";
import DateRangePicker from "@/componentes/cxc/DateRangePicker";
import { ventasService } from "@/servicios/ventas";

/* ================= helpers ================= */

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

function money(n?: number | null) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const pad6 = (n: number | string) => String(n).padStart(6, "0");

/* ====== Mini de ventas para FAC/BOL y totales ====== */
type VentaMini = {
    idVenta: number;
    tipoDocumentoTributario?: "factura" | "boleta" | string | null;
    numeroDocumento?: string | null;
    totalNetoBob?: number | null;
};

// Carga mínima desde el detalle de venta (más estable para tipo/número)
async function fetchVentaMini(idVenta: number): Promise<VentaMini | null> {
    try {
        const det: any = await ventasService.detalle(idVenta);
        return {
            idVenta,
            tipoDocumentoTributario:
                det?.tipoDocumentoTributario ?? det?.header?.tipoDocumentoTributario ?? null,
            numeroDocumento: det?.numeroDocumento ?? det?.header?.numeroDocumento ?? null,
            totalNetoBob:
                det?.totalNetoBob ??
                det?.totales?.totalNetoBob ??
                det?.total ?? // alias posibles
                null,
        };
    } catch {
        return null;
    }
}

type CxcMini = { total: number; pagado: number };

// Totales/Pagado desde CxC (maneja null para evitar TS2322)
async function fetchCxcMini(idVenta: number): Promise<CxcMini | null> {
    try {
        const det = (await cobrosService.obtenerCxcDetallePorVenta(idVenta)) as
            | CxcDetalleDTO
            | null
            | undefined;
        if (!det) return null;
        const total = Number(det.totalACobrar ?? 0);
        const pagado = Number(det.totalAplicado ?? 0);
        return { total, pagado };
    } catch {
        return null;
    }
}

/* =================== Componente =================== */

export default function CxcListado() {
    const [estado, setEstado] = useState<"" | EstadoCuenta>("");
    const [qCliente, setQCliente] = useState<string>("");

    const [emisionDesde, setEmisionDesde] = useState<string | undefined>();
    const [emisionHasta, setEmisionHasta] = useState<string | undefined>();

    const [page, setPage] = useState(0);
    const [size] = useState(15); // tamaño de página 15

    const [data, setData] = useState<Page<CxcItem> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Pago
    const [pagoCuentas, setPagoCuentas] = useState<CxcItem[]>([]);
    const [showPago, setShowPago] = useState(false);

    // Detalle de venta
    const [ventaDetalleId, setVentaDetalleId] = useState<number | null>(null);

    // Historial
    const [histVentaId, setHistVentaId] = useState<number | null>(null);
    const [histVentaLabel, setHistVentaLabel] = useState<string | undefined>(undefined);
    const [histCliente, setHistCliente] = useState<string | null>(null);

    // Cachés
    const [ventasInfo, setVentasInfo] = useState<Record<number, VentaMini>>({});
    const [cxcInfo, setCxcInfo] = useState<Record<number, CxcMini>>({});

    /* ===== cargar listado ===== */
    async function load() {
        try {
            setLoading(true);
            setErr(null);

            // Para "" (Todos), "pagado" y "vencido" no filtramos "abiertas"
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
        if (!q) return <span className="truncate block max-w-[220px]">{txt || "—"}</span>;
        const i = txt.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return <span className="truncate block max-w-[220px]">{txt}</span>;
        return (
            <span className="truncate block max-w-[220px]">
        {txt.slice(0, i)}
                <mark className="bg-yellow-100">{txt.slice(i, i + q.length)}</mark>
                {txt.slice(i + q.length)}
      </span>
        );
    }

    const allRows = useMemo(() => data?.content ?? [], [data]);

    /* ===== Estado derivado (arregla filtro "vencido") =====
       Reglas:
       - pagado: pendiente <= 0
       - vencido: pendiente > 0 y vencimiento < hoy
       - si no, usa estado del backend (parcial/pendiente/pagado) con fallback a 'pendiente'
    */
    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    function derivedEstado(r: CxcItem): EstadoCuenta {
        const pendiente = Number(r.montoPendienteBob) || 0;
        if (pendiente <= 0) return "pagado";
        const dVen = parseISOToLocalDate(r.fechaVencimiento);
        if (dVen && dVen < today) return "vencido";
        const e = String(r.estadoCuenta || "").toLowerCase() as EstadoCuenta;
        if (e === "pendiente" || e === "parcial" || e === "pagado" || e === "vencido") return e;
        return "pendiente";
    }

    const rows = useMemo(() => {
        let list = allRows;
        if (estado) list = list.filter((r) => derivedEstado(r) === estado);
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
    }, [allRows, estado, qCliente, today]);

    // cargar minis que falten (ventas y cxc) para filas visibles
    useEffect(() => {
        const visibles = rows.map((r) => r.idVenta);
        const faltanVenta = visibles.filter((id, i, arr) => arr.indexOf(id) === i).filter((id) => !ventasInfo[id]);
        const faltanCxc = visibles.filter((id, i, arr) => arr.indexOf(id) === i).filter((id) => !cxcInfo[id]);
        if (faltanVenta.length === 0 && faltanCxc.length === 0) return;

        (async () => {
            if (faltanVenta.length) {
                const acc: Record<number, VentaMini> = {};
                for (const id of faltanVenta) {
                    const m = await fetchVentaMini(id);
                    if (m) acc[id] = m;
                }
                if (Object.keys(acc).length) setVentasInfo((prev) => ({ ...prev, ...acc }));
            }
            if (faltanCxc.length) {
                const acc: Record<number, CxcMini> = {};
                for (const id of faltanCxc) {
                    const m = await fetchCxcMini(id);
                    if (m) acc[id] = m;
                }
                if (Object.keys(acc).length) setCxcInfo((prev) => ({ ...prev, ...acc }));
            }
        })();
    }, [rows, ventasInfo, cxcInfo]);

    /* ===== Totales de las cards ===== */
    const saldoTotalPendiente = useMemo(
        () => rows.reduce((acc, r) => acc + (Number(r.montoPendienteBob) || 0), 0),
        [rows]
    );

    const cantidadVencidas = useMemo(
        () => rows.filter((r) => derivedEstado(r) === "vencido").length,
        [rows]
    );

    /* ===== chips de estado ===== */
    function estadoChip(e: EstadoCuenta) {
        const map: Record<EstadoCuenta, string> = {
            pendiente: "bg-sky-100 text-sky-700",
            parcial: "bg-amber-100 text-amber-800",
            pagado: "bg-emerald-100 text-emerald-700",
            vencido: "bg-rose-100 text-rose-700",
        };
        return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[e]}`}>{e}</span>;
    }

    /* ===== Etiqueta de venta FAC-/BOL- ===== */
    function ventaDisplay(idVenta: number): string {
        const info = ventasInfo[idVenta];
        const raw = info?.numeroDocumento?.toString().trim();

        if (raw && raw.length > 0) {
            // si ya viene F-/B- lo dejamos
            if (/^[FB]-\d+$/i.test(raw)) return raw.toUpperCase();

            // normalizar FAC-/BOL- a F-/B-
            if (/^FAC-/i.test(raw)) return raw.replace(/^FAC-/i, "F-");
            if (/^BOL-/i.test(raw)) return raw.replace(/^BOL-/i, "B-");

            // si viene sin prefijo, derivar por tipo y pad numérico
            const digits = raw.match(/\d+/)?.[0];
            if (digits) {
                const tipo = String(info?.tipoDocumentoTributario || "").toLowerCase();
                const pref = tipo === "boleta" ? "B-" : "F-";
                return `${pref}${pad6(digits)}`;
            }
            return raw; // caso raro
        }

        // fallback (tipo + idVenta)
        const tipo = String(info?.tipoDocumentoTributario || "").toLowerCase();
        const pref = tipo === "boleta" ? "B-" : "F-";
        return `${pref}${pad6(idVenta)}`;
    }

    /* ===== Monto total y pagado por fila ===== */
    function montoTotalFila(r: CxcItem): number | null {
        // Preferimos totales de CxC (si el backend los calcula), si no, los de venta
        const cxc = cxcInfo[r.idVenta];
        if (cxc?.total != null) return cxc.total;
        const tot = ventasInfo[r.idVenta]?.totalNetoBob;
        return typeof tot === "number" ? tot : null;
    }

    function montoPagadoFila(r: CxcItem): number | null {
        const cxc = cxcInfo[r.idVenta];
        if (cxc?.pagado != null) return cxc.pagado;
        const tot = montoTotalFila(r);
        const pend = Number(r.montoPendienteBob) || 0;
        if (tot == null) return null;
        return Math.max(0, tot - pend);
    }

    return (
        <div className="p-4 space-y-4 text-xs">
            {/* Header + KPIs alineados a la derecha */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-lg font-semibold">Cuentas por Cobrar</div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">
                        {rows.length} resultado(s) en esta página · Pendiente total: <b>{money(saldoTotalPendiente)} BOB</b>
                    </div>
                </div>

                {/* KPI cards compactas (esquina superior derecha) */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 min-w-[220px]">
                        <div className="text-neutral-500 text-[12px]">Saldo Total Pendiente</div>
                        <div className="text-xl font-bold mt-1">{money(saldoTotalPendiente)} BOB</div>
                    </div>
                    <div className="rounded-lg border p-3 min-w-[220px]">
                        <div className="text-neutral-500 text-[12px]">Facturas Vencidas</div>
                        <div className="text-xl font-bold mt-1 text-rose-600">{cantidadVencidas}</div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Estado */}
                <div>
                    <label className="block text-[11px] mb-1">Estado</label>
                    <select
                        className="border rounded px-2 py-1.5 w-full"
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
                <div className="md:col-span-2">
                    <label className="block text-[11px] mb-1">Cliente</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre…"
                            className="border rounded pl-7 pr-2 py-1.5 w-full"
                            value={qCliente}
                            onChange={(e) => setQCliente(e.target.value)}
                        />
                    </div>
                </div>

                {/* Rango de fechas (emisión) */}
                <div>
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
            {err && <div className="text-rose-600">{err}</div>}
            {loading && <div className="text-neutral-500">Cargando…</div>}

            {!loading && !err && (
                <div className="overflow-x-auto bg-white rounded-lg border">
                    <table className="w-full text-xs text-left table-fixed">
                        <thead className="text-[11px] text-neutral-500 uppercase bg-neutral-50">
                        <tr>
                            <th className="px-4 py-2 font-medium w-[120px]">Venta</th>
                            <th className="px-4 py-2 font-medium">Cliente</th>
                            <th className="px-4 py-2 font-medium w-[110px]">F. Emisión</th>
                            <th className="px-4 py-2 font-medium w-[120px]">F. Vencimiento</th>
                            <th className="px-4 py-2 font-medium text-right w-[120px]">Monto Total (Bs)</th>
                            <th className="px-4 py-2 font-medium text-right w-[120px]">Monto Pagado (Bs)</th>
                            <th className="px-4 py-2 font-medium text-right w-[120px]">Saldo Pendiente (Bs)</th>
                            <th className="px-4 py-2 font-medium text-center w-[90px]">Estado</th>
                            <th className="px-4 py-2 font-medium text-center w-[120px]">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r) => {
                            const dEmi = parseISOToLocalDate(r.fechaEmision);
                            const dVen = parseISOToLocalDate(r.fechaVencimiento);
                            const eDer = derivedEstado(r);
                            const isVenc = eDer === "vencido";

                            const total = montoTotalFila(r);
                            const pagado = montoPagadoFila(r);
                            const pendiente = Number(r.montoPendienteBob) || 0;

                            const rowCls = isVenc ? "bg-red-100 hover:bg-red-200/60" : "hover:bg-blue-50";

                            return (
                                <tr key={r.idCuentaCobrar} className={`border-b ${rowCls}`}>
                                    <td className="px-4 py-2 font-medium text-blue-600 whitespace-nowrap">
                                        {ventaDisplay(r.idVenta)}
                                    </td>
                                    <td className="px-4 py-2">{highlightCliente(r.cliente ?? r.idCliente, qCliente)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{dEmi ? fmt.format(dEmi) : "—"}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 ${isVenc ? "text-red-600 font-medium" : ""}`}>
                        {dVen ? fmt.format(dVen) : "—"} {isVenc && <span title="Vencido">▲</span>}
                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">{money(total)}</td>
                                    <td className={`px-4 py-2 text-right ${pagado ? "text-emerald-600" : ""}`}>{money(pagado)}</td>
                                    <td className={`px-4 py-2 text-right ${isVenc ? "text-red-600 font-semibold" : "font-semibold"}`}>
                                        {money(pendiente)}
                                    </td>
                                    <td className="px-4 py-2 text-center">{estadoChip(eDer)}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-center items-center gap-1.5">
                                            <button
                                                className="p-1 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-blue-600"
                                                title="Ver Detalle"
                                                onClick={() => setVentaDetalleId(r.idVenta)}
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                className="p-1 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-blue-600 disabled:opacity-50"
                                                title={eDer === "pagado" ? "Cuenta pagada" : "Aplicar Pago"}
                                                disabled={eDer === "pagado"}
                                                onClick={() => {
                                                    setPagoCuentas([r]);
                                                    setShowPago(true);
                                                }}
                                            >
                                                <CreditCard size={14} />
                                            </button>
                                            <button
                                                className="p-1 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-blue-600"
                                                title="Historial de Pago"
                                                onClick={() => {
                                                    setHistVentaId(r.idVenta);
                                                    setHistVentaLabel(ventaDisplay(r.idVenta));
                                                    setHistCliente(r.cliente ?? null);
                                                }}
                                            >
                                                <History size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td className="px-4 py-6 text-neutral-500 text-center" colSpan={9}>
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
                <span className="text-[11px]">
          Página {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}
        </span>
                <button
                    className="border rounded px-2 py-1"
                    disabled={!data || page + 1 >= (data.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Siguiente
                </button>
            </div>

            {/* Modales */}
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

            {ventaDetalleId !== null && <VentaDetalle idVenta={ventaDetalleId} onClose={() => setVentaDetalleId(null)} />}

            {histVentaId !== null && (
                <CxcPanelDetalle
                    ventaId={histVentaId}
                    ventaLabel={histVentaLabel}
                    cliente={histCliente ?? undefined}
                    onClose={() => setHistVentaId(null)}
                />
            )}
        </div>
    );
}
