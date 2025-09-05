import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// API de inventario
import { getInventarioPorLote, getMovimientosDeLote } from "../../api/inventario";
import type {
    InventarioPorLoteItem,
    Page,
    MovimientoDeInventario,
} from "../../api/inventario";

// Catálogo: opciones de almacén
import { getAlmacenesOpciones } from "../../servicios/catalogo";
import type { OpcionIdNombre } from "../../servicios/catalogo";

type SortDir = "asc" | "desc";

const DEFAULT_SIZE = 20;
const DEFAULT_SORT = "vencimiento,asc"; // delegamos orden al backend vía Pageable

function diasHasta(fechaISO: string): number | null {
    if (!fechaISO) return null;
    const hoy = new Date();
    const f = new Date(fechaISO + "T00:00:00");
    const msPorDia = 1000 * 60 * 60 * 24;
    const diff = Math.floor(
        (f.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) /
        msPorDia
    );
    return diff;
}

function exportCsv(filename: string, rows: Record<string, any>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
    };
    const csv = [
        headers.map(esc).join(","),
        ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function parseSort(sort?: string): { field: string; dir: SortDir } {
    if (!sort) return { field: "vencimiento", dir: "asc" };
    const [f, d] = sort.split(",");
    return { field: f || "vencimiento", dir: (d as SortDir) || "asc" };
}
function buildSort(field: string, current?: string): string {
    const cur = parseSort(current);
    if (cur.field === field) {
        const nextDir: SortDir = cur.dir === "asc" ? "desc" : "asc";
        return `${field},${nextDir}`;
    }
    return `${field},asc`;
}
function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

export default function InventarioPorLotePage() {
    const [sp, setSp] = useSearchParams();

    // URL -> estado
    const [almacenId, setAlmacenId] = useState<number | undefined>(() => {
        const v = sp.get("almacenId");
        return v ? Number(v) : undefined;
    });
    const [producto, setProducto] = useState<string>(() => sp.get("producto") ?? "");
    const [productoInput, setProductoInput] = useState<string>(() => sp.get("producto") ?? "");
    const [venceAntes, setVenceAntes] = useState<string>(() => sp.get("venceAntes") ?? "");
    const [page, setPage] = useState<number>(() => Number(sp.get("page") ?? 0));
    const [size, setSize] = useState<number>(() => Number(sp.get("size") ?? DEFAULT_SIZE));
    const [sort, setSort] = useState<string>(() => sp.get("sort") ?? DEFAULT_SORT);

    // Datos
    const [data, setData] = useState<Page<InventarioPorLoteItem> | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Opciones de almacén
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);

    // Modal movimientos
    const [movOpen, setMovOpen] = useState(false);
    const [movLoading, setMovLoading] = useState(false);
    const [movError, setMovError] = useState<string | null>(null);
    const [movs, setMovs] = useState<MovimientoDeInventario[]>([]);
    const [movTitulo, setMovTitulo] = useState<string>("");

    // Cargar opciones de almacén
    useEffect(() => {
        let alive = true;
        setLoadingAlmacenes(true);
        getAlmacenesOpciones(true)
            .then((lista) => {
                if (alive) setAlmacenes(lista);
            })
            .catch(() => {
                if (alive) setAlmacenes([]);
            })
            .finally(() => {
                if (alive) setLoadingAlmacenes(false);
            });
        return () => {
            alive = false;
        };
    }, []);

    // Debounce del buscador
    const DEBOUNCE_MS = 400;
    useEffect(() => {
        const t = setTimeout(() => {
            setProducto(productoInput.trim());
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [productoInput]);

    // Sincroniza estado -> URL
    useEffect(() => {
        const params: Record<string, string> = {};
        if (almacenId !== undefined && !Number.isNaN(almacenId)) params.almacenId = String(almacenId);
        if (producto) params.producto = producto;
        if (venceAntes) params.venceAntes = venceAntes;
        if (page) params.page = String(page);
        if (size !== DEFAULT_SIZE) params.size = String(size);
        if (sort !== DEFAULT_SORT) params.sort = sort;

        setSp(params, { replace: true });
    }, [almacenId, producto, venceAntes, page, size, sort, setSp]);

    // Carga de datos
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setErr(null);

        getInventarioPorLote({
            almacenId: almacenId && !Number.isNaN(almacenId) ? almacenId : undefined,
            producto: producto || undefined,
            venceAntes: venceAntes || undefined,
            page,
            size,
            sort,
        })
            .then((r) => {
                if (!alive) return;
                setData(r);
            })
            .catch((e: any) => {
                if (!alive) return;
                setErr(e?.message ?? "Error desconocido");
                setData(null);
            })
            .finally(() => alive && setLoading(false));

        return () => {
            alive = false;
        };
    }, [almacenId, producto, venceAntes, page, size, sort]);

    const sortState = useMemo(() => parseSort(sort), [sort]);

    function onHeaderSort(field: string) {
        setSort(buildSort(field, sort));
        setPage(0);
    }

    function resetFilters() {
        setAlmacenId(undefined);
        setProducto("");
        setVenceAntes("");
        setPage(0);
        setSize(DEFAULT_SIZE);
        setSort(DEFAULT_SORT);
    }

    async function verMovimientos(row: InventarioPorLoteItem) {
        setMovOpen(true);
        setMovTitulo(`${row.producto} — Lote ${row.numeroLote}`);
        setMovLoading(true);
        setMovError(null);
        setMovs([]);

        try {
            const data = await getMovimientosDeLote(row.loteId, {
                almacenId: almacenId && !Number.isNaN(almacenId) ? almacenId : undefined,
                limit: 50,
            });
            setMovs(data);
        } catch (e: any) {
            setMovError(e?.message ?? "Error al cargar movimientos");
        } finally {
            setMovLoading(false);
        }
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Inventario por lote</h1>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                {/* Almacén: combo */}
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Almacén</label>
                    <select
                        value={almacenId ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            setAlmacenId(v === "" ? undefined : Number(v));
                            setPage(0);
                        }}
                        className="border rounded-lg px-3 py-2"
                        disabled={loadingAlmacenes}
                    >
                        <option value="">{loadingAlmacenes ? "Cargando..." : "Todos"}</option>
                        {almacenes.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2 flex flex-col">
                    <label className="text-sm text-gray-600">Producto o SKU</label>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU…"
                        value={productoInput}
                        onChange={(e) => {
                            setProductoInput(e.target.value);
                            setPage(0);
                        }}
                        className="border rounded-lg px-3 py-2"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Vence antes de</label>
                    <input
                        type="date"
                        value={venceAntes}
                        onChange={(e) => {
                            setVenceAntes(e.target.value);
                            setPage(0);
                        }}
                        className="border rounded-lg px-3 py-2"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => resetFilters()}
                        className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={() => setPage(0)}
                        className="px-4 py-2 rounded-lg bg-black text-white"
                    >
                        Aplicar
                    </button>
                    <button
                        onClick={() => {
                            const rows = (data?.content ?? []).map((r) => ({
                                SKU: r.sku,
                                Producto: r.producto,
                                Lote: r.numeroLote,
                                Vence: r.vencimiento,
                                Disponible: r.disponible,
                                Reservado: r.reservado,
                                Almacen: r.almacen,
                            }));
                            exportCsv("inventario_por_lote.csv", rows);
                        }}
                        className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                        disabled={!data || (data?.content?.length ?? 0) === 0}
                        title="Exporta el resultado actual (con filtros)"
                    >
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Estado de carga / error */}
            {loading && <div className="text-sm text-gray-600">Cargando inventario…</div>}
            {err && <div className="text-sm text-red-600">Error: {err}</div>}

            {/* Tabla */}
            <div className="overflow-auto border rounded-xl">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <Th sortable field="sku" current={sortState} onSort={onHeaderSort}>
                            SKU
                        </Th>
                        <Th sortable field="producto" current={sortState} onSort={onHeaderSort}>
                            Producto
                        </Th>
                        <Th>Lote</Th>
                        <Th sortable field="vencimiento" current={sortState} onSort={onHeaderSort}>
                            Vence
                        </Th>
                        <Th sortable field="disponible" current={sortState} onSort={onHeaderSort}>
                            Disp.
                        </Th>
                        <Th>Reserv.</Th>
                        <Th sortable field="almacen" current={sortState} onSort={onHeaderSort}>
                            Almacén
                        </Th>
                        <Th>Acciones</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {!loading && data?.content?.length === 0 && (
                        <tr>
                            <td colSpan={8} className="text-center py-8 text-gray-500">
                                Sin resultados
                            </td>
                        </tr>
                    )}
                    {data?.content?.map((row: InventarioPorLoteItem) => (
                        <tr key={`${row.loteId}-${row.presentacionId}`} className="border-t">
                            <td className="px-3 py-2 tabular-nums">{row.sku}</td>
                            <td className="px-3 py-2">{row.producto}</td>
                            <td className="px-3 py-2">{row.numeroLote}</td>
                            <td className="px-3 py-2">
                                {(() => {
                                    const d = diasHasta(row.vencimiento);
                                    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs";
                                    const badge =
                                        d === null
                                            ? "bg-gray-100 text-gray-700"
                                            : d < 0
                                                ? "bg-red-100 text-red-800"
                                                : d <= 30
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-green-100 text-green-800";
                                    const title =
                                        d === null
                                            ? "Fecha no disponible"
                                            : d < 0
                                                ? `${Math.abs(d)} día(s) vencido`
                                                : `${d} día(s) restantes`;
                                    return (
                                        <span className={`${base} ${badge}`} title={title}>
                        {row.vencimiento}
                      </span>
                                    );
                                })()}
                            </td>
                            <td
                                className={(() => {
                                    const bajo =
                                        row.stockMinimo != null &&
                                        Number(row.disponible) < Number(row.stockMinimo);
                                    return "px-3 py-2 text-right " + (bajo ? "text-red-600 font-semibold" : "");
                                })()}
                            >
                                {row.disponible}
                                {row.stockMinimo != null &&
                                    Number(row.disponible) < Number(row.stockMinimo) && (
                                        <span
                                            className="ml-1 text-xs align-middle"
                                            title={`Stock mínimo: ${row.stockMinimo}`}
                                        >
                        ⚠️
                      </span>
                                    )}
                            </td>
                            <td className="px-3 py-2 text-right">{row.reservado}</td>
                            <td className="px-3 py-2">{row.almacen}</td>
                            <td className="px-3 py-2">
                                <button
                                    onClick={() => verMovimientos(row)}
                                    className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                                    title="Ver movimientos del lote"
                                >
                                    Mov.
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Paginación / tamaño */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600">
                    {data ? (
                        <>
                            Mostrando página <strong>{(data.number ?? 0) + 1}</strong> de{" "}
                            <strong>{data.totalPages ?? 1}</strong> —{" "}
                            <strong>{data.totalElements ?? 0}</strong> elementos
                        </>
                    ) : (
                        "—"
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={loading || (data?.first ?? true)}
                    >
                        ← Anterior
                    </button>
                    <button
                        className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
                        onClick={() =>
                            setPage((p) => (data ? Math.min(data.totalPages - 1, p + 1) : p + 1))
                        }
                        disabled={loading || (data?.last ?? true)}
                    >
                        Siguiente →
                    </button>

                    <select
                        className="ml-2 border rounded-lg px-2 py-1.5"
                        value={size}
                        onChange={(e) => {
                            setSize(Number(e.target.value));
                            setPage(0);
                        }}
                    >
                        {[10, 20, 50, 100].map((n) => (
                            <option key={n} value={n}>
                                {n} por página
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Modal Movimientos */}
            {movOpen && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                    onClick={() => setMovOpen(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-[min(900px,95vw)] max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="border-b px-4 py-3 flex items-center justify-between">
                            <h2 className="font-semibold">Movimientos — {movTitulo}</h2>
                            <button
                                className="px-2 py-1 text-sm border rounded"
                                onClick={() => setMovOpen(false)}
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="p-4 space-y-3 overflow-auto">
                            {movLoading && (
                                <div className="text-sm text-gray-600">Cargando movimientos…</div>
                            )}
                            {movError && <div className="text-sm text-red-600">Error: {movError}</div>}
                            {!movLoading && !movError && movs.length === 0 && (
                                <div className="text-sm text-gray-500">Sin movimientos recientes.</div>
                            )}

                            {movs.length > 0 && (
                                <table className="min-w-full text-sm border rounded">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-3 py-2">Fecha</th>
                                        <th className="text-left px-3 py-2">Tipo</th>
                                        <th className="text-right px-3 py-2">Cantidad</th>
                                        <th className="text-left px-3 py-2">Origen</th>
                                        <th className="text-left px-3 py-2">Destino</th>
                                        <th className="text-left px-3 py-2">Referencia</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {movs.map((m, i) => {
                                        const negativo = [
                                            "salida_venta",
                                            "reserva_anticipo",
                                            "transferencia_salida",
                                        ].includes(m.tipoMovimiento);
                                        return (
                                            <tr key={i} className="border-t">
                                                <td className="px-3 py-2">{m.fechaMovimiento}</td>
                                                <td className="px-3 py-2">{m.tipoMovimiento}</td>
                                                <td
                                                    className={
                                                        "px-3 py-2 text-right " +
                                                        (negativo ? "text-red-600" : "text-green-700")
                                                    }
                                                >
                                                    {negativo ? "-" : "+"}
                                                    {m.cantidad}
                                                </td>
                                                <td className="px-3 py-2">{m.almacenOrigen ?? "—"}</td>
                                                <td className="px-3 py-2">{m.almacenDestino ?? "—"}</td>
                                                <td className="px-3 py-2">
                                                    {m.referenciaModulo} #{m.idReferencia}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Th({
                children,
                sortable,
                field,
                current,
                onSort,
            }: {
    children: React.ReactNode;
    sortable?: boolean;
    field?: string;
    current?: { field: string; dir: SortDir };
    onSort?: (f: string) => void;
}) {
    if (!sortable || !field || !current || !onSort) {
        return <th className="text-left px-3 py-2 font-medium">{children}</th>;
    }
    const active = current.field === field;
    return (
        <th
            className={cls(
                "text-left px-3 py-2 font-medium select-none cursor-pointer",
                active && "text-black",
                !active && "text-gray-700"
            )}
            onClick={() => onSort(field)}
            title="Ordenar"
        >
      <span className="inline-flex items-center gap-1">
        {children}
          <SortIcon active={active} dir={active ? current.dir : undefined} />
      </span>
        </th>
    );
}

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" className={cls(!active && "opacity-30")}>
            <path d="M7 14l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
                d="M7 10l5-5 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                transform={dir === "asc" ? undefined : "rotate(180 12 12)"}
            />
        </svg>
    );
}
