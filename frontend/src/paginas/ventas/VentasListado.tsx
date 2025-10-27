import { useEffect, useMemo, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type { Page, VentaListado, VentaEstado } from "@/types/ventas";

// Pickers / Modales
import { ClientePickerDialog, type ClienteLite } from "@/componentes/clientes/ClientePickerDialog";
import VentaNueva from "@/paginas/ventas/VentaNueva";
import VentaDetalle from "@/paginas/ventas/VentaDetalle";
import VentaTrazabilidad from "@/paginas/ventas/VentaTrazabilidad";

// ===== helpers =====
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
function normalizeTxt(s: string) {
    return (s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// === helper: Total para listado (incluye impuesto + interés como en el detalle)
function totalNetoConTodo(v: VentaListado) {
    const base = Number(v.totalNetoBob ?? 0); // ya incluye impuesto cuando es FACTURA
    const esCredito = String(v.condicionDePago ?? "").toLowerCase() === "credito";
    if (!esCredito) return base;

    // 1) si el backend ya manda el % de interés en el listado
    const interesPct = Number((v as any).interesCredito ?? 0);
    if (!Number.isNaN(interesPct) && interesPct > 0) {
        return base * (1 + interesPct / 100);
    }

    // 2) derivar interés desde la CxC cuando no tenemos el %
    const pendienteCxC = Number((v as any).cxcPendienteBob ?? 0);
    const interesDerivado = Math.max(0, pendienteCxC - base); // si ya hubo pagos, no suma interés
    return base + interesDerivado;
}

// Número (serie/correlativo). Si backend ya manda numeroDocumento lo usamos;
// de lo contrario mostramos un fallback legible: F-<id> / B-<id>
// function fmtNumeroDoc(v: VentaListado) {
//   if (v.numeroDocumento && String(v.numeroDocumento).trim() !== "") {
//     return v.numeroDocumento;
//   }
//   const tipo = String(v.tipoDocumentoTributario).toLowerCase();
//   const pref = tipo === "factura" ? "F" : "B";
//   return `${pref}-${v.idVenta}`;
// }

export default function VentasListado() {
    // ====== filtros UI ======
    // Un solo campo de cliente que acepta ID (números) o nombre (texto)
    const [clienteQ, setClienteQ] = useState<string>("");
    const [estado, setEstado] = useState<"" | VentaEstado>("");
    const [desde, setDesde] = useState<string>("");
    const [hasta, setHasta] = useState<string>("");
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

    // clienteId si el input son solo números, si no -> undefined
    const clienteIdParam = useMemo(() => {
        const trimmed = clienteQ.trim();
        if (!trimmed) return undefined;
        return /^[0-9]+$/.test(trimmed) ? Number(trimmed) : undefined;
    }, [clienteQ]);

    // filtro por nombre si NO es numérico
    const clienteNombreFilter = useMemo(() => {
        const trimmed = clienteQ.trim();
        if (!trimmed) return "";
        return /^[0-9]+$/.test(trimmed) ? "" : trimmed;
    }, [clienteQ]);

    // Construir params: si hay filtro por nombre, subimos el size para traer más filas
    const params = useMemo(() => {
        const effectiveSize = clienteNombreFilter ? Math.max(size, 100) : size;
        return {
            estado: estado || undefined,
            clienteId: clienteIdParam, // solo cuando el campo es numérico
            desde: desde || undefined,
            hasta: hasta || undefined,
            page,
            size: effectiveSize,
        };
    }, [estado, clienteIdParam, desde, hasta, page, size, clienteNombreFilter]);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const res = await ventasService.listar(params);
            setData(res);
        } catch (e: any) {
            setData(null);
            setErr(e?.message || "Error interno del servidor");
        } finally {
            setLoading(false);
        }
    }

    // carga inicial y cuando cambien params
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    // Filas a mostrar (si hay filtro por nombre, filtramos en front)
    const rows = useMemo(() => {
        const base = data?.content ?? [];
        const term = normalizeTxt(clienteNombreFilter);
        if (!term) return base;
        return base.filter((v) => normalizeTxt(v.cliente ?? "").includes(term));
    }, [data, clienteNombreFilter]);

    function aplicarFiltros() {
        setPage(0);
        load();
    }
    function limpiarFiltros() {
        setClienteQ("");
        setEstado("");
        setDesde("");
        setHasta("");
        setPage(0);
    }

    // ====== anular venta (solo este cambio agregado) ======
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
                <h1 className="text-2xl font-semibold">Ventas</h1>
                <button
                    type="button"
                    className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => setNewOpen(true)}
                >
                    Nueva venta
                </button>
            </div>

            {/* FILTROS */}
            <div className="border rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    {/* Cliente (ID o Nombre) */}
                    <div className="lg:col-span-1">
                        <label className="text-sm font-medium">Cliente</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                className="w-full border rounded px-3 py-2"
                                placeholder="ID o nombre del cliente…"
                                value={clienteQ}
                                onChange={(e) => {
                                    setClienteQ(e.target.value);
                                    setPage(0);
                                }}
                            />
                            <button
                                type="button"
                                className="px-3 py-2 border rounded text-sm hover:bg-neutral-50"
                                onClick={() => setPickerOpen(true)}
                                title="Abrir lista de clientes"
                            >
                                Lista
                            </button>
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="lg:col-span-1">
                        <label className="text-sm font-medium">Estado</label>
                        <select
                            className="w-full border rounded px-3 py-2 mt-1"
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

                    {/* Desde */}
                    <div className="lg:col-span-1">
                        <label className="text-sm font-medium">Desde</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2 mt-1"
                            value={desde}
                            onChange={(e) => {
                                setDesde(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>

                    {/* Hasta */}
                    <div className="lg:col-span-1">
                        <label className="text-sm font-medium">Hasta</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2 mt-1"
                            value={hasta}
                            onChange={(e) => {
                                setHasta(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>

                    {/* Por página */}
                    <div className="lg:col-span-1">
                        <label className="text-sm font-medium">Por página</label>
                        <select
                            className="w-full border rounded px-3 py-2 mt-1"
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
                    <button className="px-3 py-2 border rounded hover:bg-neutral-50" onClick={limpiarFiltros}>
                        Limpiar filtros
                    </button>
                    <button
                        className="px-3 py-2 border rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={aplicarFiltros}
                    >
                        Aplicar
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="border rounded-xl overflow-hidden">
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-neutral-600">
                        <tr>
                            <th className="text-left p-2">Venta #</th>
                            <th className="text-left p-2">Fecha</th>
                            <th className="text-left p-2">Cliente</th>
                            <th className="text-left p-2">Tipo Doc.</th>
                            {/* <th className="text-left p-2">Número</th> */}
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
                                <td colSpan={10} className="p-4 text-center text-neutral-500">
                                    Cargando…
                                </td>
                            </tr>
                        )}

                        {err && !loading && (
                            <tr>
                                <td colSpan={10} className="p-4 text-center text-rose-600">
                                    {err}
                                </td>
                            </tr>
                        )}

                        {!loading && !err && rows.length === 0 && (
                            <tr>
                                <td colSpan={10} className="p-8 text-center text-neutral-500">
                                    Sin resultados
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            !err &&
                            rows.map((v) => {
                                const isAnulada = String(v.estadoVenta).toLowerCase() === "anulada";
                                return (
                                    <tr key={v.idVenta} className="border-t">
                                        <td className="p-2">{v.idVenta}</td>
                                        <td className="p-2">{fmtFechaSoloDia(v.fechaVenta)}</td>
                                        <td className="p-2">{v.cliente ?? "-"}</td>
                                        <td className="p-2">{String(v.tipoDocumentoTributario).toUpperCase()}</td>
                                        {/* <td className="p-2">{fmtNumeroDoc(v)}</td> */}
                                        <td className="p-2 capitalize">{String(v.condicionDePago).toLowerCase()}</td>
                                        <td className="p-2 capitalize">{String(v.metodoDePago).toLowerCase()}</td>
                                        <td className="p-2 capitalize">{String(v.estadoVenta).toLowerCase()}</td>

                                        {/* === Total (Bs) ahora = total neto con impuesto + interés === */}
                                        <td className="p-2 text-right font-medium">
                                            {fmtMoney(totalNetoConTodo(v))}
                                        </td>

                                        <td className="p-2 text-right">{fmtMoney((v as any).cxcPendienteBob)}</td>

                                        <td className="p-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="px-2 py-1 border rounded text-sm hover:bg-neutral-50"
                                                    onClick={() => setDetalleOpen(v.idVenta)}
                                                    title="Ver detalle"
                                                >
                                                    Ver
                                                </button>
                                                <button
                                                    className="px-2 py-1 border rounded text-sm hover:bg-neutral-50"
                                                    onClick={() => setTrazaOpen(v.idVenta)}
                                                    title="Trazabilidad"
                                                >
                                                    Trazabilidad
                                                </button>
                                                {/* === Botón Anular (agregado) === */}
                                                <button
                                                    className="px-2 py-1 border rounded text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
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

                {/* Paginación (se mantiene la del backend) */}
                <div className="flex items-center gap-2 p-2">
                    <button
                        className="px-3 py-2 border rounded disabled:opacity-50"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={!data || (data as any).first || loading}
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-neutral-600">
                        Página {(data?.number ?? 0) + 1} de {data?.totalPages ?? 1}
                    </span>
                    <button
                        className="px-3 py-2 border rounded disabled:opacity-50"
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
                        // puedes llenar por nombre o por ID, como prefieras
                        setClienteQ(c.nombre); // o String(c.idCliente)
                        setPickerOpen(false);
                        setPage(0);
                    }}
                />
            )}

            {/* Modal: Nueva Venta */}
            {newOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto p-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold">Nueva venta</h3>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded hover:bg-neutral-50"
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
                                    // refresca inmediatamente al crear
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
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-auto p-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold">Detalle de venta #{detalleOpen}</h3>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded hover:bg-neutral-50"
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
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto p-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold">Trazabilidad de venta #{trazaOpen}</h3>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded hover:bg-neutral-50"
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
