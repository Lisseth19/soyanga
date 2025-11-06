import { useEffect, useState } from "react";
import { preciosService } from "@/servicios/precios";
import AjusteManualModal from "@/componentes/precios/AjusteManualModal";
import type { Page } from "@/types/pagination";
import type { PrecioHistoricoDTO, FiltroHistoricoDTO } from "@/types/precios";

export default function HistorialPrecios() {
    const [sku, setSku] = useState("");
    const [desde, setDesde] = useState<string>("");
    const [hasta, setHasta] = useState<string>("");
    const [motivo, setMotivo] = useState("");
    const [usuario, setUsuario] = useState("");

    const [page, setPage] = useState(0);
    const [size] = useState(20);

    const emptyPage: Page<PrecioHistoricoDTO> = {
        content: [],
        totalPages: 0,
        totalElements: 0,
        number: 0,
        size,            // 20
        first: true,
        last: true,
    };

    const [data, setData] = useState<Page<PrecioHistoricoDTO>>(emptyPage);


    const [modalManual, setModalManual] = useState<{ open: boolean; id: number | null; sku?: string }>({
        open: false,
        id: null,
    });

    const buscar = async (p = page) => {
        const filtro: FiltroHistoricoDTO = {
            sku: sku || undefined,
            desde: desde ? `${desde}T00:00:00` : undefined,
            hasta: hasta ? `${hasta}T23:59:59` : undefined,
            motivo: motivo || undefined,
            usuario: usuario || undefined,
        };
        try {
            const r = await preciosService.buscarHistorico(filtro, p, size);

            setData({
                // toma todo lo que venga
                ...(r as Page<PrecioHistoricoDTO>),
                // y completa faltantes con valores razonables
                content: r.content ?? [],
                totalPages: r.totalPages ?? 0,
                totalElements: r.totalElements ?? 0,
                number: (r as any).number ?? p,
                size: (r as any).size ?? size,
                first: (r as any).first ?? p === 0,
                last:
                    (r as any).last ??
                    ((r.totalPages ?? 1) <= p + 1),
            });

            setPage(p);
        } catch (e: any) {
            alert(e.message || "Error al buscar");
        }
    };


    useEffect(() => {
        // primera carga: vacío
    }, []);

    const revertir = async (idHist: number) => {
        if (!confirm("¿Revertir a este precio? Creará un nuevo vigente.")) return;
        try {
            await preciosService.revertir(idHist, "ui");
            alert("Reversión aplicada");
            buscar(0);
        } catch (e: any) {
            alert(e.message || "No se pudo revertir");
        }
    };

    return (
        <div className="p-6 text-slate-100">
            <h1 className="text-3xl font-bold mb-6">Historial de Cambios de Precios</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filtros */}
                <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                    <div className="mb-3">
                        <label className="text-sm opacity-80">Buscar por SKU</label>
                        <input
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="Ingresa el SKU"
                            className="w-full mt-1 rounded-lg bg-slate-800 px-3 py-2 border border-slate-700"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm opacity-80">Desde</label>
                            <input
                                type="date"
                                value={desde}
                                onChange={(e) => setDesde(e.target.value)}
                                className="w-full mt-1 rounded-lg bg-slate-800 px-3 py-2 border border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="text-sm opacity-80">Hasta</label>
                            <input
                                type="date"
                                value={hasta}
                                onChange={(e) => setHasta(e.target.value)}
                                className="w-full mt-1 rounded-lg bg-slate-800 px-3 py-2 border border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="mt-3">
                        <label className="text-sm opacity-80">Motivo del Cambio</label>
                        <input
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Promoción, TC, manual…"
                            className="w-full mt-1 rounded-lg bg-slate-800 px-3 py-2 border border-slate-700"
                        />
                    </div>

                    <div className="mt-3">
                        <label className="text-sm opacity-80">Usuario</label>
                        <input
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="usuario"
                            className="w-full mt-1 rounded-lg bg-slate-800 px-3 py-2 border border-slate-700"
                        />
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button onClick={() => buscar(0)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                            Aplicar Filtros
                        </button>
                        <button
                            onClick={() => {
                                setSku("");
                                setDesde("");
                                setHasta("");
                                setMotivo("");
                                setUsuario("");
                                setPage(0);
                                setData(emptyPage);
                            }}
                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
                        >
                            Limpiar
                        </button>

                    </div>
                </aside>

                {/* Tabla */}
                <section className="lg:col-span-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-left opacity-70">
                                <tr>
                                    <th className="p-2">SKU</th>
                                    <th className="p-2">Precio</th>
                                    <th className="p-2">Vigencia</th>
                                    <th className="p-2">Motivo</th>
                                    <th className="p-2">Estado</th>
                                    <th className="p-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.content.map((h) => (
                                    <tr key={h.idPrecioHistorico} className="border-t border-slate-700">
                                        <td className="p-2">{sku}</td>
                                        <td className="p-2 font-semibold">Bs {Number(h.precioVentaBob).toFixed(2)}</td>
                                        <td className="p-2">
                                            {new Date(h.fechaInicioVigencia).toLocaleString()}{" "}
                                            {h.fechaFinVigencia ? `— ${new Date(h.fechaFinVigencia).toLocaleString()}` : ""}
                                        </td>
                                        <td className="p-2">{h.motivoCambio ?? "-"}</td>
                                        <td className="p-2">{h.vigente ? <span className="text-emerald-400">●</span> : <span className="opacity-50">–</span>}</td>
                                        <td className="p-2 flex gap-2">
                                            {!h.vigente && (
                                                <button
                                                    onClick={() => revertir(h.idPrecioHistorico)}
                                                    className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-500"
                                                >
                                                    Revertir
                                                </button>
                                            )}
                                            {h.vigente && (
                                                <button
                                                    onClick={() => setModalManual({ open: true, id: h.idPresentacion, sku })}
                                                    className="px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600"
                                                >
                                                    Ajuste manual
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {data.content.length === 0 && (
                                    <tr>
                                        <td className="p-4 opacity-70" colSpan={6}>
                                            Aplica filtros para ver resultados…
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <button
                            disabled={page <= 0}
                            onClick={() => buscar(page - 1)}
                            className="px-3 py-1 rounded-md bg-slate-700 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <div className="opacity-70 text-sm">
                            Página {page + 1} de {Math.max(1, data.totalPages)}
                        </div>
                        <button
                            disabled={page + 1 >= data.totalPages}
                            onClick={() => buscar(page + 1)}
                            className="px-3 py-1 rounded-md bg-slate-700 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </section>
            </div>

            <AjusteManualModal
                open={modalManual.open}
                onClose={() => setModalManual({ open: false, id: null })}
                idPresentacion={modalManual.id}
                sku={sku}
                onSaved={() => buscar(0)}
            />
        </div>
    );
}
