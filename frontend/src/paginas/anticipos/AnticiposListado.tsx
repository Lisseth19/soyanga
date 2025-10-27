import { useEffect, useMemo, useRef, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import type { AnticipoListado, EstadoAnticipo, Page } from "@/types/anticipos"; // <= CAMBIO: AnticipoListado
import { normalizeEstadoAnticipo } from "@/types/anticipos";
import { AnticipoCrearForm } from "./AnticipoCrearForm";
import { AplicarAnticipoModal } from "./AplicarAnticipoModal";
import ReservarAnticipoModal from "./ReservarAnticipoModal";

function EstadoChip({ e }: { e: EstadoAnticipo }) {
    const map: Record<EstadoAnticipo, string> = {
        registrado: "bg-blue-100 text-blue-700",
        parcialmente_aplicado: "bg-amber-100 text-amber-800",
        aplicado_total: "bg-emerald-100 text-emerald-700",
        anulado: "bg-neutral-200 text-neutral-700",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[e]}`}>{e.replaceAll("_", " ")}</span>;
}

// util rápida para dinero
const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

export default function AnticiposListado() {
    // filtros
    const [idCliente, setIdCliente] = useState<number | undefined>();
    const [desde, setDesde] = useState<string | undefined>();
    const [hasta, setHasta] = useState<string | undefined>();
    const [q, setQ] = useState(""); // búsqueda cliente-side (id/cliente/obs)

    // paginación
    const [page, setPage] = useState(0);
    const [size] = useState(20);

    // data/estado
    const [data, setData] = useState<Page<AnticipoListado> | null>(null); // <= CAMBIO: AnticipoListado
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // modales
    const [showCrear, setShowCrear] = useState(false);
    const [aplicarId, setAplicarId] = useState<number | null>(null);
    const [reservarId, setReservarId] = useState<number | null>(null);

    // datepicker refs
    const refDesde = useRef<HTMLInputElement>(null);
    const refHasta = useRef<HTMLInputElement>(null);



    async function fetchData() {
        try {
            setLoading(true);
            setErr(null);

            const res = await anticiposService.listar({ idCliente, desde, hasta, page, size });
            res.content = (res.content ?? []).map((a) => ({
                ...a,
                estadoAnticipo: normalizeEstadoAnticipo(a.estadoAnticipo as any),
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
    }, [idCliente, desde, hasta, page, size]);

    // filtro cliente-side
    const filas = useMemo(() => {
        const all = data?.content ?? [];
        const query = q.trim().toLowerCase();
        if (!query) return all;
        return all.filter((r) => {
            const enObs = String(r.observaciones ?? "").toLowerCase().includes(query);
            const enId = String(r.idAnticipo).includes(query);
            const enClienteId = String(r.idCliente).includes(query);
            const enClienteNom = String(r.cliente ?? "").toLowerCase().includes(query);
            return enObs || enId || enClienteId || enClienteNom;
        });
    }, [data, q]);

    return (
        <div className="p-4 space-y-4">
            {/* Header + CTA */}
            <div className="flex flex-wrap items-end gap-2">
                <div className="text-xl font-semibold flex-1 min-w-[200px]">Anticipos</div>
                <button
                    onClick={() => setShowCrear(true)}
                    className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center"
                >
                    + Nuevo Anticipo
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end">
                {/* Buscar (cliente-side) */}
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-xs mb-1">Buscar (ID, cliente, obs)</label>
                    <div className="relative">
                        <input
                            className="w-full border rounded-lg px-3 py-2 pr-10"
                            placeholder="Ej. 100 · Juan · adelanto…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* idCliente (server-side) */}
                <div>
                    <label className="block text-xs mb-1">Cliente ID</label>
                    <input
                        type="number"
                        className="border rounded-lg px-3 py-2 w-[160px]"
                        value={idCliente ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            setIdCliente(v ? Number(v) : undefined);
                            setPage(0);
                        }}
                        placeholder="Ej. 1001"
                    />
                </div>

                {/* Fecha desde */}
                <div>
                    <label className="block text-xs mb-1">Desde</label>
                    <div className="relative">
                        <input
                            ref={refDesde}
                            type="date"
                            className="border rounded-lg px-3 py-2 pr-9"
                            value={desde || ""}
                            onChange={(e) => {
                                setDesde(e.target.value || undefined);
                                setPage(0);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() =>
                                (refDesde.current as any)?.showPicker ? (refDesde.current as any).showPicker() : refDesde.current?.focus()
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
                            title="Abrir calendario"
                        >
                            📅
                        </button>
                    </div>
                </div>

                {/* Fecha hasta */}
                <div>
                    <label className="block text-xs mb-1">Hasta</label>
                    <div className="relative">
                        <input
                            ref={refHasta}
                            type="date"
                            className="border rounded-lg px-3 py-2 pr-9"
                            value={hasta || ""}
                            onChange={(e) => {
                                setHasta(e.target.value || undefined);
                                setPage(0);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() =>
                                (refHasta.current as any)?.showPicker ? (refHasta.current as any).showPicker() : refHasta.current?.focus()
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
                            title="Abrir calendario"
                        >
                            📅
                        </button>
                    </div>
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
                    const saldo = r.estadoAnticipo === "anulado" ? 0 : r.saldoDisponibleBob; // <= NUEVO
                    return (
                        <div key={r.idAnticipo} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">ANT{String(r.idAnticipo).padStart(3, "0")}</div>
                                <EstadoChip e={r.estadoAnticipo} />
                            </div>
                            <div className="mt-1 text-sm text-neutral-700">{r.cliente ?? `Cliente #${r.idCliente}`}</div>
                            <div className="mt-1 text-xs text-neutral-500">{new Date(r.fechaAnticipo).toLocaleString()}</div>
                            <div className="mt-1 text-sm">Monto: <span className="font-medium">{fmtMoney(r.montoBob)} BOB</span></div>
                            <div className="mt-1 text-sm">Aplicado: {fmtMoney(r.aplicadoAcumuladoBob)} BOB</div> {/* NUEVO */}
                            <div className="mt-1 text-sm">Saldo: <span className="font-medium">{fmtMoney(saldo)} BOB</span></div> {/* NUEVO */}
                            {r.observaciones && <div className="mt-1 text-xs text-neutral-600">{r.observaciones}</div>}
                            <div className="mt-2 flex gap-2">
                                <a href={`/anticipos/${r.idAnticipo}`} className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs">
                                    Abrir
                                </a>
                                <button
                                    className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs"
                                    onClick={() => setAplicarId(r.idAnticipo)}
                                    disabled={r.estadoAnticipo === "anulado" || r.estadoAnticipo === "aplicado_total"}
                                >
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabla desktop */}
            <div className="hidden md:block border rounded overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">CLIENTE</th>
                        <th className="p-2 text-left">FECHA</th>
                        <th className="p-2 text-right">MONTO (BOB)</th>
                        <th className="p-2 text-right">APLICADO</th>
                        <th className="p-2 text-right">SALDO (BOB)</th>
                        <th className="p-2 text-center">ESTADO</th>
                        <th className="p-2">OBS.</th>
                        <th className="p-2">ACCIONES</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filas.map((r) => {
                        const saldo = r.estadoAnticipo === "anulado" ? 0 : r.saldoDisponibleBob; // <= NUEVO
                        return (
                            <tr key={r.idAnticipo} className="border-t">
                                <td className="p-2">ANT{String(r.idAnticipo).padStart(3, "0")}</td>
                                <td className="p-2">{r.cliente ?? `#${r.idCliente}`}</td>
                                <td className="p-2">{new Date(r.fechaAnticipo).toLocaleString()}</td>
                                <td className="p-2 text-right">{fmtMoney(r.montoBob)}</td>
                                <td className="p-2 text-right">{fmtMoney(r.aplicadoAcumuladoBob)}</td>
                                <td className="p-2 text-right font-medium">{fmtMoney(saldo)}</td>
                                <td className="p-2 text-center">
                                    <EstadoChip e={r.estadoAnticipo} />
                                </td>
                                <td className="p-2 max-w-xs truncate" title={r.observaciones ?? ""}>
                                    {r.observaciones ?? "—"}
                                </td>
                                <td className="p-2">
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`/anticipos/${r.idAnticipo}`}
                                            className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                            title="Abrir"
                                        >
                                            ↗
                                        </a>

                                        <button
                                            className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                            title="Reservar stock"
                                            onClick={() => setReservarId(r.idAnticipo)}
                                            disabled={r.estadoAnticipo === "anulado"}
                                        >
                                            📦
                                        </button>

                                        <button
                                            className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                            title="Aplicar anticipo"
                                            onClick={() => setAplicarId(r.idAnticipo)}
                                            disabled={r.estadoAnticipo === "anulado" || r.estadoAnticipo === "aplicado_total"}
                                        >
                                            ✓
                                        </button>

                                        <button
                                            className="inline-flex items-center justify-center w-8 h-8 border rounded hover:bg-neutral-50"
                                            title="Liberar todas las reservas"
                                            onClick={async () => {
                                                try {
                                                    await anticiposService.liberarTodasLasReservas(r.idAnticipo);
                                                    fetchData();
                                                } catch (e: any) {
                                                    alert(e?.response?.data?.message || e?.message || "No se pudo liberar");
                                                }
                                            }}
                                            disabled={r.estadoAnticipo === "anulado"}
                                        >
                                            🧹
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

            {/* Paginación */}
            <div className="flex items-center justify-end gap-2">
                <button disabled={page <= 0} onClick={() => setPage((p) => p - 1)} className="border px-2 py-1 rounded">
                    Anterior
                </button>
                <span className="text-xs">
          Página {page + 1} / {data?.totalPages ?? 1}
        </span>
                <button
                    disabled={!!data && page >= (data.totalPages || 1) - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="border px-2 py-1 rounded"
                >
                    Siguiente
                </button>
            </div>

            {/* Modal: crear */}
            {showCrear && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-4 w-[420px]">
                        <AnticipoCrearForm onCancel={() => setShowCrear(false)} onCreated={() => { setShowCrear(false); fetchData(); }} />
                    </div>
                </div>
            )}

            {reservarId !== null && (
                <ReservarAnticipoModal
                    idAnticipo={reservarId}
                    onClose={() => setReservarId(null)}
                    onDone={() => {
                        setReservarId(null);
                        fetchData(); // refresca la lista
                    }}
                />
            )}


            {/* Modal: aplicar */}
            {aplicarId !== null && (
                <AplicarAnticipoModal
                    idAnticipo={aplicarId}
                    onClose={() => setAplicarId(null)}
                    onDone={() => {
                        setAplicarId(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}
