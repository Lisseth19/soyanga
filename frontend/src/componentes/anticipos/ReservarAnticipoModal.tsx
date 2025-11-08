import { useEffect, useMemo, useRef, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import { almacenService, type PresentacionEnAlmacenDTO, type OpcionIdNombre } from "@/servicios/almacen";
import type { AnticipoReservaDTO } from "@/types/anticipos";

/* ===== tipos exportados para el padre (modo borrador) ===== */
export type DraftReserva = {
    idAlmacen: number;
    items: Array<{ idPresentacion: number; cantidad: number }>;
    permitirSinStock: boolean;
};

/* ===== helpers ===== */
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}
function useDebounced<T>(value: T, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}
const fmtNum = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { maximumFractionDigits: 3 }).format(n ?? 0);

/* ===== tipos ui ===== */
type PickItem = {
    idPresentacion: number;
    sku?: string | null;
    producto?: string;
    presentacion?: string | null;
    unidad?: string | null;
    cantidad: number;
};

export default function ReservarAnticipoModal({
                                                  idAnticipo,                 // <-- ahora opcional
                                                  onClose,
                                                  onDone,
                                                  onDraftConfirm,            // <-- NUEVO: callback cuando no hay idAnticipo
                                              }: {
    idAnticipo?: number | null;
    onClose?: () => void;
    onDone?: () => void;
    onDraftConfirm?: (draft: DraftReserva) => void;
}) {
    // almacén
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    const [almacenId, setAlmacenId] = useState<number | "">("");
    const [manualAlmacen, setManualAlmacen] = useState(false);
    const [almacenIdManual, setAlmacenIdManual] = useState<string>("");

    // filtros/búsqueda
    const [q, setQ] = useState("");
    const debouncedQ = useDebounced(q, 350);

    // NUEVO: ver sin stock / permitir reservar sin stock
    const [incluirSinStock, setIncluirSinStock] = useState(false);
    const [permitirSinStock, setPermitirSinStock] = useState(false);

    // paginado
    const [page, setPage] = useState(0);
    const [size] = useState(10);

    // datos listado
    const [loadingList, setLoadingList] = useState(false);
    const [list, setList] = useState<PresentacionEnAlmacenDTO[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [errList, setErrList] = useState<string | null>(null);

    // selección
    const [picks, setPicks] = useState<PickItem[]>([]);
    const [errForm, setErrForm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // ESC para cerrar
    const holderRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        function onEsc(ev: KeyboardEvent) {
            if (ev.key === "Escape") onClose?.();
        }
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [onClose]);

    // cargar almacenes
    useEffect(() => {
        (async () => {
            try {
                setAlmacenes(await almacenService.options({ soloActivos: true }));
            } catch {
                setAlmacenes([]);
            }
        })();
    }, []);

    function getAlmacenIdValue(): number | null {
        if (manualAlmacen) {
            const n = Number(almacenIdManual);
            return Number.isFinite(n) && n > 0 ? n : null;
        }
        if (almacenId === "") return null;
        return Number(almacenId);
    }

    const almacenNombre = useMemo(() => {
        const id = getAlmacenIdValue();
        if (!id) return "";
        const hit = almacenes.find((a) => a.id === id);
        return hit?.nombre ?? `Almacén #${id}`;
    }, [almacenes, manualAlmacen, almacenId, almacenIdManual]);

    // listar presentaciones
    async function loadList(wantedPage = page) {
        setErrList(null);
        setLoadingList(true);
        try {
            const idAlm = getAlmacenIdValue();
            if (!idAlm) {
                setList([]);
                setTotalPages(1);
                return;
            }
            const r = await almacenService.listarPresentaciones(idAlm, {
                q: debouncedQ || undefined,
                // incluir sin stock => NO filtrar por stock
                soloConStock: !incluirSinStock,
                page: wantedPage,
                size,
            });
            setList(r.content ?? []);
            setTotalPages(r.totalPages ?? 1);
            setPage(r.number ?? wantedPage);
        } catch (e: any) {
            setErrList(e?.response?.data?.message || e?.message || "No se pudo listar productos.");
            setList([]);
            setTotalPages(1);
        } finally {
            setLoadingList(false);
        }
    }

    // refrescar cuando cambie almacén o búsqueda/toggles
    useEffect(() => {
        setPage(0);
        loadList(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ, manualAlmacen, almacenId, almacenIdManual, incluirSinStock]);

    // selección
    function addPick(p: PresentacionEnAlmacenDTO) {
        const sinStock = (p.stockDisponible ?? 0) <= 0;
        // si no hay stock y no está permitido, no agregamos
        if (sinStock && !permitirSinStock) return;

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
                    sku: p.sku ?? undefined,
                    producto: p.producto,
                    presentacion: p.presentacion ?? undefined,
                    unidad: p.unidad ?? undefined,
                    cantidad: 1,
                },
            ];
        });
    }
    function setQty(idPresentacion: number, qty: number) {
        setPicks((xs) =>
            xs.map((it) =>
                it.idPresentacion === idPresentacion ? { ...it, cantidad: Math.max(0, qty) } : it
            )
        );
    }
    function removePick(idPresentacion: number) {
        setPicks((xs) => xs.filter((it) => it.idPresentacion !== idPresentacion));
    }

    // submit
    async function submit() {
        setErrForm(null);
        const idAlm = getAlmacenIdValue();
        if (!idAlm) {
            setErrForm("Selecciona un almacén válido.");
            return;
        }
        const items = picks
            .map((it) => ({
                idPresentacion: it.idPresentacion,
                cantidad: Number(it.cantidad),
            }))
            .filter((it) => it.idPresentacion > 0 && Number.isFinite(it.cantidad) && it.cantidad > 0);

        if (items.length === 0) {
            setErrForm("Agrega al menos un producto con cantidad > 0.");
            return;
        }

        // ===== MODO BORRADOR (sin idAnticipo) =====
        if (!idAnticipo) {
            onDraftConfirm?.({ idAlmacen: idAlm, items, permitirSinStock });
            onDone?.();
            onClose?.();
            return;
        }

        // ===== MODO POST (con idAnticipo) =====
        const dto: AnticipoReservaDTO = { idAlmacen: idAlm, items };
        try {
            setSaving(true);
            await anticiposService.reservar(idAnticipo, dto, { permitirSinStock });
            onDone?.();
        } catch (e: any) {
            setErrForm(e?.response?.data?.message || e?.message || "No se pudo reservar.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div ref={holderRef} className="bg-white rounded-2xl shadow-xl w-[960px] max-w-[96vw]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold">Reservar presentaciones / productos</div>
                    <button
                        className="px-3 py-1.5 border rounded hover:bg-neutral-50"
                        onClick={onClose}
                        title="Cerrar"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Col 1: Almacén + búsqueda/toggles */}
                    <div className="md:col-span-1 space-y-3">
                        <div className="border rounded-lg p-3">
                            <div className="text-sm font-medium mb-2">Almacén</div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="inline-flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={manualAlmacen}
                                        onChange={(e) => setManualAlmacen(e.target.checked)}
                                    />
                                    Escribir ID manualmente
                                </label>
                            </div>

                            {!manualAlmacen ? (
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    value={almacenId === "" ? "" : String(almacenId)}
                                    onChange={(e) => setAlmacenId(e.target.value ? Number(e.target.value) : "")}
                                >
                                    <option value="">— Selecciona un almacén —</option>
                                    {almacenes.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.nombre}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Ej. 1"
                                    value={almacenIdManual}
                                    onChange={(e) => setAlmacenIdManual(e.target.value)}
                                    inputMode="numeric"
                                />
                            )}

                            <div className="text-xs text-neutral-500 mt-2">
                                {almacenNombre ? `Seleccionado: ${almacenNombre}` : "Aún no has seleccionado un almacén."}
                            </div>
                        </div>

                        <div className="border rounded-lg p-3 space-y-2">
                            <div className="text-sm font-medium">Buscar productos</div>

                            <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={incluirSinStock}
                                    onChange={(e) => setIncluirSinStock(e.target.checked)}
                                />
                                Incluir productos sin stock
                            </label>

                            <label className="block text-xs">
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={permitirSinStock}
                                    onChange={(e) => setPermitirSinStock(e.target.checked)}
                                />
                                Permitir reservar sin stock (crea pedido)
                            </label>

                            <input
                                className="w-full border rounded px-3 py-2"
                                placeholder="Producto, SKU o presentación"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                disabled={!getAlmacenIdValue()}
                            />

                            <div className="text-xs text-neutral-500">
                                {incluirSinStock
                                    ? "Se listan presentaciones del almacén, incluso sin stock."
                                    : "Se listan presentaciones con stock disponible."}
                            </div>
                        </div>
                    </div>

                    {/* Col 2: resultados */}
                    <div className="md:col-span-1 border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Resultados</div>
                            <div className="text-xs text-neutral-500">
                                Página {page + 1} / {totalPages}
                            </div>
                        </div>

                        {!getAlmacenIdValue() ? (
                            <div className="mt-3 text-sm text-neutral-500">Selecciona un almacén para ver productos.</div>
                        ) : loadingList ? (
                            <div className="mt-3 text-sm">Cargando…</div>
                        ) : errList ? (
                            <div className="mt-3 text-sm text-red-600">{errList}</div>
                        ) : list.length === 0 ? (
                            <div className="mt-3 text-sm text-neutral-500">Sin resultados.</div>
                        ) : (
                            <ul className="mt-3 divide-y">
                                {list.map((p) => {
                                    const sinStock = (p.stockDisponible ?? 0) <= 0;
                                    const canAdd = !sinStock || permitirSinStock;
                                    return (
                                        <li key={p.idPresentacion} className="py-2 flex items-start gap-3">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">
                                                    {p.producto}
                                                    {p.sku ? <span className="text-xs text-neutral-500"> {" "}[{p.sku}]</span> : null}
                                                    {sinStock && (
                                                        <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">
                              sin stock
                            </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-neutral-600">
                                                    {p.presentacion ?? "Presentación"}
                                                    {p.unidad ? ` · ${p.unidad}` : ""} — Stock: <b>{fmtNum(p.stockDisponible)}</b>
                                                    {typeof p.reservado === "number" ? <> · Reservado: {fmtNum(p.reservado)}</> : null}
                                                    {typeof p.precioBob === "number" ? <> · Precio: {fmtNum(p.precioBob)} BOB</> : null}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className={clsx(
                                                    "shrink-0 px-2 py-1 border rounded text-sm",
                                                    canAdd ? "hover:bg-neutral-50" : "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={() => canAdd && addPick(p)}
                                                title={sinStock && !permitirSinStock ? "Sin stock" : "Agregar"}
                                                disabled={!canAdd}
                                            >
                                                Agregar
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {/* paginación */}
                        <div className="mt-3 flex items-center justify-between">
                            <button
                                className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                                disabled={page <= 0 || loadingList}
                                onClick={() => loadList(page - 1)}
                            >
                                ← Anterior
                            </button>
                            <button
                                className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                                disabled={page >= totalPages - 1 || loadingList}
                                onClick={() => loadList(page + 1)}
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>

                    {/* Col 3: selección */}
                    <div className="md:col-span-1 border rounded-lg p-3">
                        <div className="text-sm font-medium mb-2">Ítems a reservar</div>
                        {picks.length === 0 ? (
                            <div className="text-sm text-neutral-500">Aún no has agregado productos.</div>
                        ) : (
                            <ul className="space-y-2">
                                {picks.map((it) => (
                                    <li key={it.idPresentacion} className="border rounded p-2">
                                        <div className="text-sm font-medium">
                                            {it.producto} {it.sku ? <span className="text-xs text-neutral-500">[{it.sku}]</span> : null}
                                        </div>
                                        <div className="text-xs text-neutral-600">
                                            {it.presentacion ?? "Presentación"}{it.unidad ? ` · ${it.unidad}` : ""}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <label className="text-xs text-neutral-600">Cantidad</label>
                                            <input
                                                className="w-24 border rounded px-2 py-1"
                                                value={String(it.cantidad)}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(",", ".");
                                                    const n = Number(v);
                                                    setQty(it.idPresentacion, Number.isFinite(n) ? n : 0);
                                                }}
                                                inputMode="decimal"
                                            />
                                            <button
                                                type="button"
                                                className="ml-auto px-2 py-1 border rounded hover:bg-neutral-50 text-sm"
                                                onClick={() => removePick(it.idPresentacion)}
                                                title="Quitar"
                                            >
                                                Quitar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {errForm && <div className="mt-3 text-sm text-red-600">{errForm}</div>}

                        <div className="mt-3 flex items-center justify-end gap-2">
                            <button className="px-3 py-2 border rounded" onClick={onClose}>Cancelar</button>
                            <button
                                className={clsx(
                                    "px-3 py-2 border rounded bg-emerald-600 text-white hover:bg-emerald-700",
                                    (saving || picks.length === 0 || !getAlmacenIdValue()) && "opacity-60 cursor-not-allowed"
                                )}
                                disabled={saving || picks.length === 0 || !getAlmacenIdValue()}
                                onClick={submit}
                            >
                                {saving ? "Reservando…" : idAnticipo ? "Reservar" : "Guardar selección"}
                            </button>
                        </div>

                        <div className="mt-2 text-[11px] text-neutral-500">
                            Las reservas con stock se asignan por lotes (FEFO).
                            {permitirSinStock && (
                                <> Si no hay stock, se registrará un <b>pedido</b> (sin lote) y se convertirá en reserva automáticamente cuando ingrese stock.</>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
