import { useEffect, useMemo, useState } from "react";
import Tarjeta from "../componentes/ui/Tarjeta";
import {
    listarMonedas,
    crearMoneda,
    actualizarMoneda,
    cambiarEstado,              // <-- NUEVO
    type Moneda,
    type MonedaCrear,
    type MonedaActualizar,
    type Page,
} from "../api/monedas";

/** Paleta: verde (primario), blanco (base), azul (acciones/enlaces). */
const btnGhost =
    "px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50";
const btnPrimary =
    "px-4 py-2 rounded-xl text-white bg-green-600 hover:bg-green-700 transition";
const input =
    "px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const selectCls =
    "px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

type OrdenKey = "nombre" | "codigo";
type SortDir = "asc" | "desc";

// formateador de tipo de cambio
function fmtTC(v?: number | null) {
    if (v == null || Number.isNaN(Number(v))) return "—";
    return Number(v).toFixed(6).replace(/\.?0+$/, "");
}

export default function MonedasPage() {
    /** Filtros / estado de UI */
    const [q, setQ] = useState("");
    const [activos, setActivos] = useState<boolean>(true);
    const [page, setPage] = useState(0); // 0-based
    const [size, setSize] = useState(20);
    const [orden, setOrden] = useState<OrdenKey>("nombre");
    const [dir, setDir] = useState<SortDir>("asc");

    /** Datos */
    const [data, setData] = useState<Page<Moneda> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    /** Drawer (panel lateral) */
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<Moneda | null>(null);
    const [form, setForm] = useState<MonedaCrear>({
        codigo: "",
        nombre: "",
        esLocal: false,
        tasaCambioRespectoLocal: undefined,
    });

    /** Carga con debounce del buscador en tiempo real */
    useEffect(() => {
        const t = setTimeout(() => {
            load();
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, activos, page, size, orden, dir]);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const sortField = orden === "nombre" ? "nombreMoneda" : "codigoMoneda";
            const sort = `${sortField},${dir}`;
            const r = await listarMonedas({
                q: q.trim() || undefined,
                activos,
                page,
                size,
                sort,
            });
            setData(r);
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Error cargando monedas");
        } finally {
            setLoading(false);
        }
    }

    /** Handlers UI */
    function abrirCrear() {
        setEdit(null);
        setForm({
            codigo: "",
            nombre: "",
            esLocal: false,
            tasaCambioRespectoLocal: undefined,
        });
        setOpen(true);
    }

    function abrirEditar(m: Moneda) {
        setEdit(m);
        setForm({
            codigo: m.codigo,
            nombre: m.nombre,
            esLocal: m.esLocal,
            // si backend manda tasa para no-locales, prellenamos
            tasaCambioRespectoLocal: m.tasaCambioRespectoLocal ?? undefined,
        });
        setOpen(true);
    }

    function cerrarDrawer() {
        setOpen(false);
    }

    async function guardar(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (edit) {
                // EDICIÓN
                const payload: MonedaActualizar = {
                    codigo: form.codigo.trim().toUpperCase(),
                    nombre: form.nombre.trim(),
                    esLocal: !!form.esLocal,
                    estadoActivo: edit.estadoActivo,
                    // Enviar la tasa SOLO si no es local
                    tasaCambioRespectoLocal: form.esLocal
                        ? undefined
                        : form.tasaCambioRespectoLocal,
                    // fechaVigencia: "2025-09-08", // si un día agregas date picker
                };
                await actualizarMoneda(edit.id, payload);
            } else {
                // CREACIÓN
                const payload: MonedaCrear = {
                    codigo: form.codigo.trim().toUpperCase(),
                    nombre: form.nombre.trim(),
                    esLocal: !!form.esLocal,
                    tasaCambioRespectoLocal: form.esLocal
                        ? undefined
                        : form.tasaCambioRespectoLocal,
                };
                await crearMoneda(payload);
            }
            cerrarDrawer();
            setPage(0);
            await load();
        } catch (e: any) {
            alert(e?.response?.data?.message ?? "Error guardando");
        }
    }


    async function onToggleEstado(m: Moneda) {
        try {
            if (m.esLocal && m.estadoActivo) {
                alert("La moneda local no puede inhabilitarse.");
                return;
            }
            await cambiarEstado(m.id, !m.estadoActivo);
            await load();
        } catch (e: any) {
            alert(e?.response?.data?.message ?? "No se pudo cambiar el estado");
        }
    }

    /** Exportar CSV del contenido actual de la tabla */
    function exportCSV() {
        const rows = (data?.content ?? []).map((r) => ({
            codigo: r.codigo,
            nombre: r.nombre,
            // Solo para no-locales
            tipo_cambio: r.esLocal ? "" : fmtTC(r.tasaCambioRespectoLocal),
            local: r.esLocal ? "SI" : "NO",
            estado: r.estadoActivo ? "ACTIVA" : "INACTIVA",
        }));
        if (!rows.length) return;
        const headers = Object.keys(rows[0]).join(",");
        const body = rows
            .map((r) =>
                Object.values(r)
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n");
        const blob = new Blob([headers + "\n" + body], {
            type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "monedas.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    const totalPages = useMemo(() => data?.totalPages ?? 1, [data]);

    return (
        <div className="moneda-page">
            <div className="moneda-container px-4 py-6">
                <header className="mb-6">
                    <h1 className="text-3xl font-semibold">Gestión de Monedas</h1>
                </header>

                {/* Barra superior */}
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                        <label className="text-sm text-gray-600 block" htmlFor="buscarMoneda">
                            <span className="mb-1 block">Buscar moneda…</span>
                            <input
                                id="buscarMoneda"
                                className={input + " w-full md:w-[340px]"}
                                placeholder="USD, Euro, Boliviano…"
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setPage(0);
                                }}
                            />
                        </label>

                        <div className="flex gap-2">
                            <label className="text-sm text-gray-600 block" htmlFor="ordenPor">
                                <span className="mb-1 block">Ordenar por</span>
                                <select
                                    id="ordenPor"
                                    className={selectCls}
                                    value={orden}
                                    onChange={(e) => {
                                        setOrden(e.target.value as OrdenKey);
                                        setPage(0);
                                    }}
                                    title="Ordenar por"
                                >
                                    <option value="nombre">Nombre (A–Z)</option>
                                    <option value="codigo">Código (A–Z)</option>
                                </select>
                            </label>
                            <button
                                className={btnGhost}
                                title={dir === "asc" ? "Ascendente" : "Descendente"}
                                onClick={() => {
                                    setDir((d) => (d === "asc" ? "desc" : "asc"));
                                    setPage(0);
                                }}
                            >
                                {dir === "asc" ? "↑" : "↓"}
                            </button>
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm mt-1 md:mt-0">
                            <input
                                type="checkbox"
                                checked={!activos}
                                onChange={(e) => {
                                    setActivos(!e.target.checked);
                                    setPage(0);
                                }}
                            />
                            <span>Mostrar monedas inactivas</span>
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button className={btnGhost} onClick={exportCSV}>
                            Exportar a CSV
                        </button>
                        <button className={btnPrimary} onClick={abrirCrear}>
                            + Añadir Moneda
                        </button>
                    </div>
                </div>

                {/* Tabla */}
                <Tarjeta className="bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                            <tr className="text-gray-600">
                                <th className="text-left px-4 py-3">MONEDA</th>
                                <th className="text-left px-4 py-3">NOMBRE</th>
                                <th className="text-left px-4 py-3">TIPO DE CAMBIO</th>
                                <th className="text-left px-4 py-3">LOCAL</th>
                                <th className="text-left px-4 py-3">ACCIONES</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Cargando…
                                    </td>
                                </tr>
                            )}
                            {!loading && (data?.content?.length ?? 0) === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                        Sin resultados
                                    </td>
                                </tr>
                            )}
                            {data?.content?.map((m) => (
                                <tr key={m.id} className="border-t table-row-hover">
                                    <td className="px-4 py-3 font-semibold text-green-700">
                                        {m.codigo}
                                    </td>
                                    <td className="px-4 py-3">{m.nombre}</td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {/* Mostrar TC solo para no-locales */}
                                        {m.esLocal ? "—" : fmtTC(m.tasaCambioRespectoLocal)}
                                    </td>
                                    <td className="px-4 py-3">
                      <span className={`pill ${m.esLocal ? "pill-si" : "pill-no"}`}>
                        {m.esLocal ? "Sí" : "No"}
                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                className="text-blue-700 hover:underline"
                                                onClick={() => abrirEditar(m)}
                                            >
                                                Editar
                                            </button>

                                            {/* Activar/Inactivar */}
                                            <button
                                                className="text-gray-700 hover:underline disabled:opacity-50"
                                                onClick={() => onToggleEstado(m)}
                                                disabled={m.esLocal && m.estadoActivo}
                                                title={
                                                    m.esLocal && m.estadoActivo
                                                        ? "La moneda local no puede inhabilitarse"
                                                        : m.estadoActivo
                                                            ? "Inactivar moneda"
                                                            : "Activar moneda"
                                                }
                                            >
                                                {m.estadoActivo ? "Inactivar" : "Activar"}
                                            </button>

                                            {/* (Opcional) Eliminar físico — tu backend hace soft delete por DELETE */}
                                            {/* <button className="text-red-600 hover:underline" onClick={() => onEliminar(m.id)}>
                          Eliminar
                        </button> */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3">
                        <div className="text-sm text-gray-600">
                            {data ? (
                                <>
                                    Mostrando página <b>{(data.number ?? 0) + 1}</b> de{" "}
                                    <b>{data.totalPages ?? 1}</b> —{" "}
                                    <b>{data.totalElements ?? 0}</b> elementos
                                </>
                            ) : (
                                "—"
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className={btnGhost}
                                disabled={loading || (data?.first ?? true)}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                            >
                                ← Anterior
                            </button>
                            <button
                                className={btnGhost}
                                disabled={loading || (data?.last ?? true)}
                                onClick={() =>
                                    setPage((p) => (data ? Math.min(totalPages - 1, p + 1) : p + 1))
                                }
                            >
                                Siguiente →
                            </button>

                            <label className="text-sm text-gray-600" htmlFor="tamPagina">
                                <span className="sr-only">Elementos por página</span>
                                <select
                                    id="tamPagina"
                                    className={selectCls}
                                    value={size}
                                    onChange={(e) => {
                                        setSize(Number(e.target.value));
                                        setPage(0);
                                    }}
                                    title="Elementos por página"
                                >
                                    {[10, 20, 50, 100].map((n) => (
                                        <option key={n} value={n}>
                                            {n} por página
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>
                </Tarjeta>

                {/* Drawer lateral (panel blanco) */}
                {open && (
                    <div className="drawer" onClick={cerrarDrawer}>
                        <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
                            <div className="border-b px-5 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    {edit ? "Editar Moneda" : "Agregar Nueva Moneda"}
                                </h2>
                                <button
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={cerrarDrawer}
                                >
                                    ✕
                                </button>
                            </div>

                            <form className="p-5 grid gap-3" onSubmit={guardar}>
                                <label className="grid gap-1" htmlFor="codigoMoneda">
                                    <span className="text-sm text-gray-600">Código*</span>
                                    <input
                                        id="codigoMoneda"
                                        className={input}
                                        placeholder="p. ej., USD"
                                        value={form.codigo}
                                        onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="grid gap-1" htmlFor="nombreMoneda">
                                    <span className="text-sm text-gray-600">Nombre*</span>
                                    <input
                                        id="nombreMoneda"
                                        className={input}
                                        placeholder="p. ej., Dólar estadounidense"
                                        value={form.nombre}
                                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="inline-flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        checked={form.esLocal}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, esLocal: e.target.checked }))
                                        }
                                    />
                                    <span>Es moneda local</span>
                                </label>

                                {!form.esLocal && (
                                    <label className="grid gap-1" htmlFor="tcMoneda">
                    <span className="text-sm text-gray-600">
                      Tipo de cambio (respecto a la local)
                    </span>
                                        <input
                                            id="tcMoneda"
                                            className={input}
                                            type="number"
                                            step="0.000001"
                                            min="0"
                                            placeholder="p. ej., 6.96"
                                            value={form.tasaCambioRespectoLocal ?? ""}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    tasaCambioRespectoLocal: e.target.value
                                                        ? Number(e.target.value)
                                                        : undefined,
                                                }))
                                            }
                                        />
                                    </label>
                                )}

                                {err && <div className="text-red-600 text-sm">{err}</div>}

                                <div className="mt-2 flex justify-end gap-2">
                                    <button type="button" className={btnGhost} onClick={cerrarDrawer}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className={btnPrimary}>
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}
