//ReservarAnticipoModal.tsx
import { useEffect, useMemo, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import { almacenService, type PresentacionEnAlmacenDTO, type OpcionIdNombre } from "@/servicios/almacen";
import type { AnticipoReservaDTO } from "@/types/anticipos";
import PresenPorAlmacen from "@/componentes/anticipos/PresenPorAlmacen";

/* ========== helpers ========== */
const fmtNum = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { maximumFractionDigits: 3 }).format(n ?? 0);
const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

type PickItem = {
    idPresentacion: number;
    sku?: string | null;
    producto?: string;
    presentacion?: string | null;
    unidad?: string | null;
    stockDisp?: number | null;
    reservado?: number | null;
    precioBob?: number | null;
    cantidad: number; // entero
};

export default function ReservarAnticipoModal({
                                                  idAnticipo,
                                                  onClose,
                                                  onDone,
                                              }: {
    idAnticipo: number;
    onClose?: () => void;
    onDone?: () => void;
}) {
    // almacén
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    const [almacenId, setAlmacenId] = useState<number | "">("");

    // selección y picker
    const [pickerOpen, setPickerOpen] = useState(false);
    const [picks, setPicks] = useState<PickItem[]>([]);

    const [, setErrForm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // cargar almacenes
    useEffect(() => {
        almacenService.options({ soloActivos: true }).then(setAlmacenes).catch(() => setAlmacenes([]));
    }, []);

    const almacenNombre = useMemo(() => {
        if (almacenId === "") return "";
        const hit = almacenes.find((a) => a.id === Number(almacenId));
        return hit?.nombre ?? (almacenId ? `Almacén #${almacenId}` : "");
    }, [almacenes, almacenId]);

    // agregar desde picker
    function addFromPicker(p: PresentacionEnAlmacenDTO) {
        const id = Number(p.idPresentacion);
        setPicks((xs) => {
            const found = xs.find((it) => it.idPresentacion === id);
            if (found) {
                return xs.map((it) =>
                    it.idPresentacion === id ? { ...it, cantidad: it.cantidad + 1 } : it
                );
            }
            return [
                ...xs,
                {
                    idPresentacion: id,
                    sku: p.sku ?? null,
                    producto: p.producto ?? "",
                    presentacion: p.presentacion ?? null,
                    unidad: p.unidad ?? null,
                    stockDisp: p.stockDisponible ?? null,
                    reservado: p.reservado ?? null,
                    precioBob: typeof p.precioBob === "number" ? p.precioBob : null,
                    cantidad: 1,
                },
            ];
        });
    }

    function setQtyEntero(idPresentacion: number, raw: string) {
        const clean = raw.replace(/[^\d]/g, "");
        const n = clean === "" ? 0 : parseInt(clean, 10);
        setPicks((xs) =>
            xs.map((it) => (it.idPresentacion === idPresentacion ? { ...it, cantidad: Math.max(0, n) } : it))
        );
    }

    function removePick(idPresentacion: number) {
        setPicks((xs) => xs.filter((it) => it.idPresentacion !== idPresentacion));
    }

    const totalReserva = useMemo(
        () => picks.reduce((acc, it) => acc + (Number(it.precioBob ?? 0) * Number(it.cantidad || 0)), 0),
        [picks]
    );

    // submit
    async function submit() {
        setErrForm(null);
        const idAlm = almacenId === "" ? null : Number(almacenId);
        if (!idAlm) {
            setErrForm("Selecciona un almacén válido.");
            return;
        }
        const items = picks
            .map((it) => ({ idPresentacion: it.idPresentacion, cantidad: Math.floor(Number(it.cantidad) || 0) }))
            .filter((it) => it.idPresentacion > 0 && it.cantidad > 0);

        if (items.length === 0) {
            setErrForm("Agrega al menos un producto con cantidad > 0.");
            return;
        }

        const dto: AnticipoReservaDTO = { idAlmacen: idAlm, items };

        try {
            setSaving(true);
            await anticiposService.reservar(idAnticipo, dto);
            onDone?.();
        } catch (e: any) {
            setErrForm(e?.response?.data?.message || e?.message || "No se pudo reservar.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-[1100px] max-w-[98vw] border border-neutral-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold">Reservar presentaciones / productos</div>
                    <button
                        className="h-8 px-3 rounded-md border border-neutral-300 hover:bg-neutral-50 text-sm"
                        onClick={onClose}
                        title="Cerrar"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Selección de almacén + botón agregar */}
                <div className="px-5 py-4 border-b">
                    <div className="flex flex-wrap justify-between items-end gap-3">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-neutral-800 mb-1">Almacén</label>
                            <select
                                className="h-10 w-64 rounded-lg border border-neutral-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={almacenId ?? ""}
                                onChange={(e) => setAlmacenId(e.target.value ? Number(e.target.value) : "")}
                            >
                                <option value="">Seleccionar almacén…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>{a.nombre}</option>
                                ))}
                            </select>
                            <div className="text-xs text-neutral-500 mt-2">
                                {almacenNombre ? `Seleccionado: ${almacenNombre}` : "Aún no has seleccionado un almacén."}
                            </div>
                        </div>

                        <button
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                            disabled={!almacenId}
                            onClick={() => setPickerOpen(true)}
                        >
                            <span className="text-base">＋</span> Añadir Productos
                        </button>
                    </div>
                </div>

                {/* Tabla de ítems (debajo) */}
                <div className="p-5">
                    <div className="overflow-x-auto rounded-lg border border-neutral-200">
                        <table className="min-w-[820px] w-full text-sm">
                            <thead className="bg-neutral-50 text-neutral-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Nombre</th>
                                <th className="px-4 py-2 text-left font-medium">SKU</th>
                                <th className="px-4 py-2 text-right font-medium">Acción</th>
                                <th className="px-4 py-2 text-right font-medium">Reservado</th>
                                <th className="px-4 py-2 text-right font-medium">Precio</th>
                                <th className="px-4 py-2 text-center font-medium">Cantidad</th>
                                <th className="px-4 py-2 text-right font-medium">Total</th>
                                <th className="px-4 py-2 text-center font-medium">—</th>
                            </tr>
                            </thead>
                            <tbody className="text-neutral-800">
                            {picks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                                        Aún no has agregado productos.
                                    </td>
                                </tr>
                            ) : (
                                picks.map((it) => {
                                    const totalLinea = (it.precioBob ?? 0) * (it.cantidad ?? 0);
                                    return (
                                        <tr key={it.idPresentacion} className="border-t border-neutral-200">
                                            <td className="px-4 py-2 align-middle">
                                                <div className="font-medium">{it.producto}</div>
                                                <div className="text-xs text-neutral-500">
                                                    {it.presentacion ?? "Presentación"}{it.unidad ? ` · ${it.unidad}` : ""}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 align-middle">{it.sku ?? "—"}</td>
                                            <td className="px-4 py-2 text-right align-middle">{fmtNum(it.stockDisp)}</td>
                                            <td className="px-4 py-2 text-right align-middle">
                                                {typeof it.reservado === "number" ? fmtNum(it.reservado) : "—"}
                                            </td>
                                            <td className="px-4 py-2 text-right align-middle">
                                                {typeof it.precioBob === "number" ? `${fmtMoney(it.precioBob)} BOB` : "—"}
                                            </td>
                                            <td className="px-4 py-2 text-center align-middle">
                                                <input
                                                    className="w-20 h-8 border border-neutral-300 rounded-md px-2 text-right"
                                                    value={String(it.cantidad)}
                                                    onChange={(e) => setQtyEntero(it.idPresentacion, e.target.value)}
                                                    inputMode="numeric"
                                                    pattern="\d*"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right align-middle">{fmtMoney(totalLinea)} BOB</td>
                                            <td className="px-4 py-2 text-center align-middle">
                                                <button
                                                    className="h-8 px-2 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm"
                                                    onClick={() => removePick(it.idPresentacion)}
                                                    title="Quitar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer: total + acciones (verde/rojo) */}
                <div className="px-5 pb-5 flex flex-col items-end gap-4">
                    <div className="w-full flex justify-end items-center gap-4">
                        <span className="text-xl font-bold text-neutral-900">Total:</span>
                        <span className="text-2xl font-bold text-emerald-600">{fmtMoney(totalReserva)} BOB</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            className="h-10 px-5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            className="h-10 px-5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={saving || picks.length === 0 || !almacenId}
                            onClick={submit}
                        >
                            {saving ? "Reservando…" : "Confirmar Reserva"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Picker */}
            <PresenPorAlmacen
                idAlmacen={almacenId === "" ? null : Number(almacenId)}
                abierto={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onPick={(p) => {
                    addFromPicker(p);
                    setPickerOpen(false);
                }}
            />
        </div>
    );
}
