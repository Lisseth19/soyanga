import { useEffect, useMemo, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import { http } from "@/servicios/httpClient";
import type { AnticipoReservaRespuestaDTO, LotePick } from "@/types/anticipos";
import AlmacenPickerDialog from "@/componentes/anticipos/AlmacenPickerDialog";

type Row = {
    idAlmacen: number | "";
    nomAlmacen: string;
    idPresentacion: number | "";
    descPresentacion: string;
    cantidad: number | "";
};

type Props = {
    idAnticipo: number;
    onClose: () => void;
    onDone?: (r: AnticipoReservaRespuestaDTO) => void;
};

/* ===== Tipos para Presentación (picker) ===== */
type PresentacionRow = {
    idPresentacion: number;
    sku: string;
    producto: string;
    disponible?: number;
    reservado?: number;
};

/* ===== Util ===== */
const fmt3 = (n?: number | string) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(n ?? 0));

/* ===== Picker de Presentaciones (inline popover) ===== */
function PresentacionPicker({
                                open,
                                almacenId,
                                onClose,
                                onPick,
                            }: {
    open: boolean;
    almacenId?: number;
    onClose: () => void;
    onPick: (p: PresentacionRow) => void;
}) {
    const [q, setQ] = useState("");
    const [data, setData] = useState<PresentacionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function fetchPresentaciones() {
        try {
            if (!almacenId) {
                setErr("Selecciona primero un almacén.");
                return;
            }
            setLoading(true);
            setErr(null);
            // Ajusta a tu endpoint real
            const res = await http.get<any>("/v1/inventario/presentaciones", {
                params: { almacenId, q: q || undefined },
            });
            const list: PresentacionRow[] = (res?.content ?? res ?? []).map((r: any) => ({
                idPresentacion: r.idPresentacion ?? r.presentacionId ?? r.id,
                sku: r.sku ?? "",
                producto: r.producto ?? r.nombre ?? "",
                disponible: Number(r.disponible ?? r.cantidadDisponible ?? 0),
                reservado: Number(r.reservado ?? r.cantidadReservada ?? 0),
            }));
            setData(list);
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo listar presentaciones");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open) fetchPresentaciones();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, almacenId]);

    const filtrados = useMemo(() => {
        if (!q) return data;
        const s = q.toLowerCase();
        return data.filter(
            (p) => p.producto.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || String(p.idPresentacion).includes(s)
        );
    }, [data, q]);

    if (!open) return null;
    return (
        <div className="absolute z-50 mt-1 w-[560px] bg-white border rounded-xl shadow-lg p-3">
            <div className="flex items-center gap-2 mb-2">
                <input
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Buscar presentación (producto, SKU, ID)…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <button onClick={fetchPresentaciones} className="border px-2 py-1 rounded">
                    Buscar
                </button>
            </div>
            {err && <div className="text-red-600 text-xs mb-2">{err}</div>}
            {loading ? (
                <div className="text-sm">Cargando…</div>
            ) : (
                <div className="max-h-64 overflow-auto divide-y">
                    {filtrados.map((p) => (
                        <button
                            key={p.idPresentacion}
                            onClick={() => {
                                onPick(p);
                                onClose();
                            }}
                            className="w-full text-left px-2 py-2 hover:bg-neutral-50"
                        >
                            <div className="font-medium">
                                #{p.idPresentacion} — {p.producto}
                            </div>
                            <div className="text-xs text-neutral-600">SKU: {p.sku}</div>
                            <div className="text-xs text-neutral-600">
                                Disp: {fmt3(p.disponible)} · Res: {fmt3(p.reservado)}
                            </div>
                        </button>
                    ))}
                    {filtrados.length === 0 && <div className="text-sm text-neutral-500 px-2 py-2">Sin resultados.</div>}
                </div>
            )}
            <div className="flex justify-end pt-2">
                <button onClick={onClose} className="text-sm border rounded px-3 py-1">
                    Cerrar
                </button>
            </div>
        </div>
    );
}

/* ===== Modal principal ===== */
export default function ReservarAnticipoModal({ idAnticipo, onClose, onDone }: Props) {
    const [rows, setRows] = useState<Row[]>([
        { idAlmacen: "", nomAlmacen: "", idPresentacion: "", descPresentacion: "", cantidad: "" },
    ]);

    // Dialog de almacenes (centrado)
    const [showAlmPickerForRow, setShowAlmPickerForRow] = useState<number | null>(null);

    // Popover de presentaciones (por fila)
    const [openPickPres, setOpenPickPres] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [result, setResult] = useState<AnticipoReservaRespuestaDTO | null>(null);

    function updateRow(i: number, patch: Partial<Row>) {
        setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    }
    function addRow() {
        setRows((rs) => [...rs, { idAlmacen: "", nomAlmacen: "", idPresentacion: "", descPresentacion: "", cantidad: "" }]);
    }
    function removeRow(i: number) {
        setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        for (const r of rows) {
            if (!r.idAlmacen || !r.idPresentacion || !r.cantidad) {
                setErr("Completa almacén, presentación y cantidad en todas las filas.");
                return;
            }
        }
        try {
            setLoading(true);
            const payload = {
                items: rows.map((r) => ({
                    idAlmacen: Number(r.idAlmacen),
                    idPresentacion: Number(r.idPresentacion),
                    cantidad: Number(r.cantidad),
                })),
            };
            const resp = await anticiposService.reservar(idAnticipo, payload as any);
            setResult(resp);
            onDone?.(resp);
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || "No se pudo reservar";
            setErr(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-4 w-[720px] max-h-[90vh] overflow-auto relative">
                {/* cerrar */}
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 w-8 h-8 rounded-full border hover:bg-neutral-50"
                    title="Cerrar"
                >
                    ✕
                </button>

                <div className="text-lg font-semibold mb-3">Reservar stock para anticipo #{idAnticipo}</div>

                {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

                {!result ? (
                    <form onSubmit={onSubmit} className="space-y-3">
                        <div className="space-y-2">
                            {rows.map((r, i) => {
                                const canPickPres = !!r.idAlmacen;
                                return (
                                    <div key={i} className="grid grid-cols-12 gap-3 items-end relative">
                                        {/* Almacén */}
                                        <div className="col-span-4">
                                            <label className="block text-xs mb-1">Almacén</label>
                                            <div className="flex gap-2">
                                                <input
                                                    className="border rounded px-3 py-2 w-full"
                                                    placeholder="Nombre o ID…"
                                                    value={r.nomAlmacen || (r.idAlmacen ? `#${r.idAlmacen}` : "")}
                                                    onChange={(e) => updateRow(i, { nomAlmacen: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAlmPickerForRow(i)}
                                                    className="border rounded px-2 py-2"
                                                    title="Listar almacenes"
                                                >
                                                    🔎
                                                </button>
                                            </div>
                                        </div>

                                        {/* Presentación */}
                                        <div className="col-span-5">
                                            <label className="block text-xs mb-1">Presentación</label>
                                            <div className="flex gap-2">
                                                <input
                                                    className="border rounded px-3 py-2 w-full"
                                                    placeholder="Producto/SKU o ID…"
                                                    value={r.descPresentacion || (r.idPresentacion ? `#${r.idPresentacion}` : "")}
                                                    onChange={(e) => updateRow(i, { descPresentacion: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => canPickPres && setOpenPickPres(i)}
                                                    className="border rounded px-2 py-2 disabled:opacity-50"
                                                    disabled={!canPickPres}
                                                    title={canPickPres ? "Listar presentaciones del almacén" : "Selecciona un almacén primero"}
                                                >
                                                    📋
                                                </button>
                                                {openPickPres === i && (
                                                    <div className="absolute left-0 top-full">
                                                        <PresentacionPicker
                                                            open
                                                            almacenId={typeof r.idAlmacen === "number" ? r.idAlmacen : undefined}
                                                            onClose={() => setOpenPickPres(null)}
                                                            onPick={(p) =>
                                                                updateRow(i, {
                                                                    idPresentacion: p.idPresentacion,
                                                                    descPresentacion: `${p.producto} · ${p.sku}`,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cantidad */}
                                        <div className="col-span-3">
                                            <label className="block text-xs mb-1">Cantidad</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                className="border rounded px-3 py-2 w-full"
                                                value={r.cantidad}
                                                onChange={(e) => updateRow(i, { cantidad: e.target.value ? Number(e.target.value) : "" })}
                                                placeholder="Ej. 3"
                                            />
                                        </div>

                                        {/* Acciones fila */}
                                        <div className="col-span-12 flex justify-end gap-2">
                                            <button type="button" className="text-xs px-2 py-1 border rounded" onClick={() => removeRow(i)}>
                                                Eliminar fila
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <div>
                                <button type="button" onClick={addRow} className="text-sm px-3 py-1 border rounded">
                                    + Agregar fila
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button type="button" onClick={onClose} className="border rounded px-3 py-2" disabled={loading}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-emerald-600 text-white rounded px-3 py-2 disabled:opacity-60"
                                disabled={loading}
                            >
                                {loading ? "Reservando…" : "Reservar"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3">
                        <div className="text-sm">
                            <span className="font-medium">Reserva creada.</span> Detalle:
                        </div>
                        <div className="border rounded">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 text-left">Presentación</th>
                                    <th className="p-2 text-right">Solicitado</th>
                                    <th className="p-2 text-right">Reservado</th>
                                    <th className="p-2 text-left">Lotes (id : cantidad)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {result.reservas.map((it: AnticipoReservaRespuestaDTO["reservas"][number], idx: number) => (
                                    <tr key={idx} className="border-t">
                                        <td className="p-2">{it.idPresentacion}</td>
                                        <td className="p-2 text-right">{fmt3(it.cantidadSolicitada)}</td>
                                        <td className="p-2 text-right">{fmt3(it.cantidadReservada)}</td>
                                        <td className="p-2">
                                            {it.lotes && it.lotes.length > 0
                                                ? it.lotes.map((l: LotePick) => `${l.idLote} : ${fmt3(l.cantidad)}`).join(", ")
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button onClick={onClose} className="bg-emerald-600 text-white rounded px-3 py-2">
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* === Dialog de selección de almacén === */}
            {showAlmPickerForRow !== null && (
                <AlmacenPickerDialog
                    open
                    onClose={() => setShowAlmPickerForRow(null)}
                    onPick={(a) => {
                        updateRow(showAlmPickerForRow!, {
                            idAlmacen: a.idAlmacen,
                            nomAlmacen: a.nombreAlmacen,
                        });
                        setShowAlmPickerForRow(null);
                    }}
                />
            )}
        </div>
    );
}
