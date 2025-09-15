import { useEffect, useMemo, useState } from "react";
import { monedaService } from "@/servicios/moneda";
import type { Moneda } from "@/types/moneda";
import type { Page } from "@/types/pagination";
import { exportCsv } from "@/utils/csv";

// Orden correcto por campo de entidad
const DEFAULT_SORT = "nombreMoneda,asc";

type FormState = {
    codigo: string;
    nombre: string;
    tasa: string;       // texto del input; lo convertimos a number al guardar
    esLocal: boolean;
};

function SearchIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.71.71l.27.28v.79L20 21.49 21.49 20 15.5 14zM10 15a5 5 0 110-10 5 5 0 010 10z" fill="currentColor" />
        </svg>
    );
}
function DownloadIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M5 20h14v-2H5v2zM11 4h2v8h3l-4 4-4-4h3V4z" fill="currentColor" />
        </svg>
    );
}
function Badge({ ok }: { ok: boolean }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {ok ? "Sí" : "No"}
    </span>
    );
}

export default function MonedasPage() {
    // filtros (sin paginación)
    const [q, setQ] = useState("");
    const [mostrarInactivas, setMostrarInactivas] = useState(false);

    // datos
    const [data, setData] = useState<Page<Moneda> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // form (agregar/editar)
    const [editando, setEditando] = useState<Moneda | null>(null);
    const [form, setForm] = useState<FormState>({ codigo: "", nombre: "", tasa: "", esLocal: false });
    const [guardando, setGuardando] = useState(false);

    // activos param: undefined = todas; true = solo activas
    const activosParam = useMemo(() => (mostrarInactivas ? undefined : true), [mostrarInactivas]);

    const exportRows = useMemo(() =>
        (data?.content ?? []).map(m => ({
            MONEDA: m.codigo,
            NOMBRE: m.nombre,
            "TIPO DE CAMBIO": m.esLocal ? 1 : (m.tasaCambioRespectoLocal ?? "—"),
            LOCAL: m.esLocal ? "Sí" : "No",
            ESTADO: m.estadoActivo ? "Activo" : "Inactivo",
        })), [data]);

    async function cargar() {
        setLoading(true); setErr(null);
        try {
            // Sin page/size: que el backend use sus defaults
            const res = await monedaService.list({
                q: q || undefined,
                activos: activosParam,
                sort: DEFAULT_SORT,
            });
            setData(res);
        } catch (e:any) {
            setErr(e?.message || "Error cargando monedas");
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { cargar(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [q, activosParam]);

    function startCrear() {
        setEditando(null);
        setForm({ codigo: "", nombre: "", tasa: "", esLocal: false });
    }
    function startEditar(m: Moneda) {
        setEditando(m);
        setForm({
            codigo: m.codigo ?? "",
            nombre: m.nombre ?? "",
            tasa: m.esLocal ? "" : String(m.tasaCambioRespectoLocal ?? ""),
            esLocal: !!m.esLocal,
        });
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const codigo = (form.codigo ?? "").trim().toUpperCase();
        const nombre = (form.nombre ?? "").trim();
        const tasaStr = (form.tasa ?? "").trim();

        if (!codigo || !nombre) { alert("Código y nombre son obligatorios"); return; }

        let tasaNum: number | null = null;
        if (!form.esLocal && tasaStr) {
            tasaNum = Number(tasaStr);
            if (Number.isNaN(tasaNum)) { alert("Tipo de cambio inválido"); return; }
        }

        const payload = {
            codigo,
            nombre,
            esLocal: !!form.esLocal,
            tasaCambioRespectoLocal: form.esLocal ? null : tasaNum,
            ...(editando ? { estadoActivo: true } : {}),
        };

        setGuardando(true);
        try {
            if (editando) await monedaService.update(editando.idMoneda, payload);
            else await monedaService.create(payload);
            await cargar();
            startCrear();
        } catch (e:any) {
            const msg = e?.message || (e?.details ? JSON.stringify(e.details) : "No se pudo guardar");
            alert(msg);
        } finally {
            setGuardando(false);
        }
    }

    async function onToggleActivo(m: Moneda) {
        try {
            await monedaService.toggleActivo(m.idMoneda, !m.estadoActivo);
            await cargar();
        } catch (e:any) {
            alert(e?.message || "No se pudo cambiar el estado");
        }
    }

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
            {/* Columna izquierda: título, filtros, tabla */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-800">Gestión de Monedas</h1>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon/></span>
                            <input
                                value={q}
                                onChange={(e)=> setQ(e.target.value)}
                                placeholder="Buscar moneda…"
                                className="form-input w-full rounded-md border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <button
                            onClick={()=> exportCsv("monedas.csv", exportRows)}
                            className="flex items-center gap-2 rounded-md h-10 px-4 bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                            disabled={!exportRows.length}
                        >
                            <DownloadIcon/> <span>Exportar un CSV</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-600"
                            checked={mostrarInactivas}
                            onChange={(e)=> setMostrarInactivas(e.target.checked)}
                        />
                        Mostrar monedas inactivas
                    </label>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {loading && <div className="p-4 text-sm text-gray-600">Cargando…</div>}
                    {err && <div className="p-4 text-sm text-red-600">Error: {err}</div>}
                    {!loading && !err && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Moneda</th>
                                    <th className="px-6 py-3">Nombre</th>
                                    <th className="px-6 py-3">Tipo de cambio</th>
                                    <th className="px-6 py-3">Local</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                                </thead>
                                <tbody>
                                {(data?.content ?? []).map((m, i) => (
                                    <tr key={m.idMoneda ?? m.codigo ?? i} className="bg-white border-b hover:bg-gray-50">
                                        <th scope="row" className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{m.codigo}</th>
                                        <td className="px-6 py-4">{m.nombre}</td>
                                        <td className="px-6 py-4">{m.esLocal ? 1 : (m.tasaCambioRespectoLocal ?? "—")}</td>
                                        <td className="px-6 py-4"><Badge ok={m.esLocal} /></td>
                                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                            <button className="font-medium text-blue-600 hover:underline" onClick={()=>startEditar(m)}>Editar</button>
                                            <button
                                                className={m.estadoActivo ? "font-medium text-red-600 hover:underline" : "font-medium text-emerald-600 hover:underline"}
                                                onClick={()=>onToggleActivo(m)}
                                            >
                                                {m.estadoActivo ? "Desactivar" : "Activar"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.content || data.content.length === 0) && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Sin resultados</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Columna derecha: formulario */}
            <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {editando ? "Editar Moneda" : "Agregar Nueva Moneda"}
                    </h3>
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                            <input
                                className="form-input w-full rounded-md border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="p. ej., AUD"
                                value={form.codigo ?? ""}
                                onChange={(e)=> setForm(f => ({ ...f, codigo: e.target.value.toUpperCase().slice(0, 10) }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                className="form-input w-full rounded-md border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="p. ej., Dólar Australiano"
                                value={form.nombre ?? ""}
                                onChange={(e)=> setForm(f => ({ ...f, nombre: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio</label>
                            <input
                                className="form-input w-full rounded-md border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50"
                                placeholder={form.esLocal ? "1.00 (fijo para moneda local)" : "p. ej., 1.50"}
                                value={form.tasa ?? ""}
                                onChange={(e)=> setForm(f => ({ ...f, tasa: e.target.value }))}
                                disabled={form.esLocal}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Es Local</label>
                            <select
                                className="form-select w-full rounded-md border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                value={form.esLocal ? "si" : "no"}
                                onChange={(e)=> setForm(f => ({ ...f, esLocal: e.target.value === "si", tasa: e.target.value === "si" ? "" : f.tasa }))}
                            >
                                <option value="no">No</option>
                                <option value="si">Sí</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={guardando}
                                className="flex-1 flex justify-center items-center gap-2 rounded-md h-10 px-4 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {editando ? "Guardar Cambios" : "Agregar Moneda"}
                            </button>
                            {editando && (
                                <button type="button" onClick={startCrear} className="h-10 px-4 rounded-md border border-neutral-300 hover:bg-neutral-50">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
