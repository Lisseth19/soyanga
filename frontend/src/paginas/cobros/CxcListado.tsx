import { useEffect, useMemo, useState } from "react";
import { cobrosService } from "@/servicios/cobros";
import type { CxcItem, EstadoCuenta, Page } from "@/types/cobros";
import { AplicarPagoModal } from "./AplicarPagoModal";

export default function CxcListado() {
    const [estado, setEstado] = useState<"" | EstadoCuenta>("");
    const [clienteId, setClienteId] = useState<number | "">("");
    const [desde, setDesde] = useState<string | undefined>();
    const [hasta, setHasta] = useState<string | undefined>();

    const [page, setPage] = useState(0);
    const [size] = useState(20);

    const [data, setData] = useState<Page<CxcItem> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [seleccion, setSeleccion] = useState<Record<number, boolean>>({});
    const [showPago, setShowPago] = useState(false);

    async function load() {
        try {
            setLoading(true);
            setErr(null);
            const res = await cobrosService.listarCxc({
                estado: estado || undefined,
                clienteId: clienteId === "" ? undefined : Number(clienteId),
                desde,
                hasta,
                page,
                size,
            });
            setData(res);
            setSeleccion({});
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo cargar CxC");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [estado, clienteId, desde, hasta, page, size]);

    const rows = useMemo(() => data?.content ?? [], [data]);
    const selRows = useMemo(() => rows.filter(r => !!seleccion[r.idCuentaCobrar]), [rows, seleccion]);

    function estadoChip(e: EstadoCuenta) {
        const map: Record<EstadoCuenta, string> = {
            pendiente: "bg-sky-100 text-sky-700",
            parcial: "bg-amber-100 text-amber-800",
            pagado: "bg-emerald-100 text-emerald-700",
            vencido: "bg-rose-100 text-rose-700",
        };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[e]}`}>{e}</span>;
    }

    function toggle(id: number) {
        setSeleccion(s => ({ ...s, [id]: !s[id] }));
    }

    return (
        <div className="p-4 space-y-4">
            <div className="text-xl font-semibold">Cuentas por Cobrar</div>

            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs mb-1">Estado</label>
                    <select
                        className="border rounded px-3 py-2"
                        value={estado}
                        onChange={(e) => { setEstado(e.target.value as any); setPage(0); }}
                    >
                        <option value="">Todos</option>
                        {["pendiente","parcial","pagado","vencido"].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs mb-1">Cliente ID</label>
                    <input
                        type="number"
                        className="border rounded px-3 py-2 w-36"
                        value={clienteId}
                        onChange={(e) => { const v = e.target.value; setClienteId(v === "" ? "" : Number(v)); setPage(0); }}
                        placeholder="Ej. 1001"
                    />
                </div>
                <div>
                    <label className="block text-xs mb-1">Desde</label>
                    <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={desde || ""}
                        onChange={(e) => { setDesde(e.target.value || undefined); setPage(0); }}
                    />
                </div>
                <div>
                    <label className="block text-xs mb-1">Hasta</label>
                    <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={hasta || ""}
                        onChange={(e) => { setHasta(e.target.value || undefined); setPage(0); }}
                    />
                </div>
                <button className="border rounded px-3 py-2" onClick={load}>Refrescar</button>
                <button
                    className="border rounded px-3 py-2 bg-emerald-600 text-white disabled:opacity-50"
                    onClick={() => setShowPago(true)}
                    disabled={selRows.length === 0}
                    title={selRows.length === 0 ? "Selecciona al menos una CxC" : "Aplicar pago"}
                >
                    Aplicar pago
                </button>
            </div>

            {/* Tabla */}
            {err && <div className="text-red-600 text-sm">{err}</div>}
            {loading && <div>Cargando…</div>}

            {!loading && !err && (
                <div className="border rounded overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50">
                        <tr className="text-left">
                            <th className="px-3 py-2 w-10"></th>
                            <th className="px-3 py-2">Venta</th>
                            <th className="px-3 py-2">Cliente</th>
                            <th className="px-3 py-2">Emisión</th>
                            <th className="px-3 py-2">Vencimiento</th>
                            <th className="px-3 py-2 text-right">Pendiente (BOB)</th>
                            <th className="px-3 py-2 text-center">Estado</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map(r => (
                            <tr key={r.idCuentaCobrar} className="border-t">
                                <td className="px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={!!seleccion[r.idCuentaCobrar]}
                                        onChange={() => toggle(r.idCuentaCobrar)}
                                    />
                                </td>
                                <td className="px-3 py-2">#{r.idVenta}</td>
                                <td className="px-3 py-2">{r.cliente ?? r.idCliente}</td>
                                <td className="px-3 py-2">{new Date(r.fechaEmision).toLocaleDateString()}</td>
                                <td className="px-3 py-2">{new Date(r.fechaVencimiento).toLocaleDateString()}</td>
                                <td className="px-3 py-2 text-right">{(r.montoPendienteBob ?? 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-center">{estadoChip(r.estadoCuenta)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td className="px-3 py-4 text-neutral-500" colSpan={7}>Sin resultados.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Paginación */}
            <div className="flex items-center justify-end gap-2">
                <button className="border rounded px-2 py-1" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>
                    Anterior
                </button>
                <span className="text-xs">
          Página { (data?.number ?? 0) + 1 } / { data?.totalPages ?? 1 }
        </span>
                <button
                    className="border rounded px-2 py-1"
                    disabled={!data || (page + 1) >= (data.totalPages || 1)}
                    onClick={() => setPage(p => p + 1)}
                >
                    Siguiente
                </button>
            </div>

            {/* Modal pago */}
            {showPago && (
                <AplicarPagoModal
                    cuentas={selRows}
                    onClose={() => setShowPago(false)}
                    onDone={() => { setShowPago(false); load(); }}
                />
            )}
        </div>
    );
}
