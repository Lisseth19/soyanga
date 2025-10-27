import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { anticiposService } from "@/servicios/anticipos";
import type { PageAplicacionAnticipo, AplicacionAnticipoItem } from "@/types/anticipos";
import { AplicarAnticipoModal } from "./AplicarAnticipoModal";

export default function AnticipoDetalle() {
    const { id } = useParams();
    const idAnticipo = Number(id);

    const [cab, setCab] = useState<any | null>(null); // header anticipo, si lo quieres
    const [page, setPage] = useState(0);
    const [size] = useState(20);
    const [data, setData] = useState<PageAplicacionAnticipo | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [showAplicar, setShowAplicar] = useState(false);

    async function load() {
        try {
            setLoading(true);
            setErr(null);
            // header (opcional)
            try { setCab(await anticiposService.obtener(idAnticipo)); } catch {}

            const res = await anticiposService.listarAplicacionesPorAnticipo(idAnticipo, { page, size });
            setData(res);
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? e?.message ?? "No se pudo cargar el historial");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { if (!isNaN(idAnticipo)) load(); }, [idAnticipo, page, size]);

    const rows = useMemo<AplicacionAnticipoItem[]>(() => data?.content ?? [], [data]);
    const totalAplicadoBob = useMemo(
        () => rows.reduce((acc, it) => acc + (Number(it.montoAplicadoBob) || 0), 0),
        [rows]
    );

    if (isNaN(idAnticipo)) return <div className="p-4">ID inválido</div>;

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold">Anticipo #{idAnticipo}</h3>
                    {cab && (
                        <div className="text-xs text-neutral-600">
                            Cliente #{cab.idCliente} · {new Date(cab.fechaAnticipo).toLocaleString()} ·
                            Monto {(cab.montoBob ?? 0).toFixed(2)} BOB · Estado {String(cab.estadoAnticipo).replaceAll("_"," ")}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-sm">Total aplicado: <b>{totalAplicadoBob.toFixed(2)} BOB</b></div>
                    <button className="border rounded px-3 py-1" onClick={() => setShowAplicar(true)}>Aplicar</button>
                    <button className="border rounded px-3 py-1" onClick={load}>Refrescar</button>
                </div>
            </div>

            {loading && <div>Cargando…</div>}
            {err && <div className="text-red-600">{err}</div>}

            {!loading && !err && (
                <>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-50">
                            <tr className="text-left">
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Venta</th>
                                <th className="px-3 py-2 text-right">Aplicado (BOB)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.length === 0 && (
                                <tr><td className="px-3 py-4 text-neutral-500" colSpan={3}>Sin aplicaciones registradas</td></tr>
                            )}
                            {rows.map(r => (
                                <tr key={r.idAplicacionAnticipo} className="border-t">
                                    <td className="px-3 py-2">{new Date(r.fechaAplicacion).toLocaleString()}</td>
                                    <td className="px-3 py-2">#{r.idVenta}</td>
                                    <td className="px-3 py-2 text-right">{(r.montoAplicadoBob ?? 0).toFixed(2)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-2">
                            <button className="border rounded px-2 py-1" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
                            <div className="text-sm">Página {page + 1} / {data.totalPages}</div>
                            <button className="border rounded px-2 py-1" disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                        </div>
                    )}
                </>
            )}

            {showAplicar && (
                <AplicarAnticipoModal
                    idAnticipo={idAnticipo}
                    onClose={() => setShowAplicar(false)}
                    onDone={() => { setShowAplicar(false); load(); }}
                />
            )}
        </div>
    );
}
