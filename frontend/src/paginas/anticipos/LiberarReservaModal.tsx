import { useEffect, useMemo, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import { presentacionService } from "@/servicios/presentacion";
import { almacenService } from "@/servicios/almacen";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}
const fmtNum = (n?: number | null) => new Intl.NumberFormat("es-BO", { maximumFractionDigits: 3 }).format(n ?? 0);

type CanonReservaItem = {
    idPresentacion: number;
    idAlmacen: number;
    reservado: number;
    liberar: number; // editable
    selected: boolean;
    lotes: Array<{ idLote: number; cantidad: number; numeroLote?: string | null; fechaVencimiento?: string | null }>;
};

type PresInfo = { presentacion: string; producto?: string; um?: string; sku?: string };

function toCanonReservas(resp: any): CanonReservaItem[] {
    if (!resp) return [];
    if (Array.isArray(resp.items)) {
        return resp.items.map((it: any) => ({
            idPresentacion: Number(it.idPresentacion),
            idAlmacen: Number(it.idAlmacen),
            reservado: Number(it.total ?? it.cantidad ?? 0),
            liberar: 0,
            selected: true,
            lotes: (it.lotes ?? []).map((l: any) => ({
                idLote: Number(l.idLote),
                cantidad: Number(l.cantidad ?? 0),
                numeroLote: l.numeroLote ?? null,
                fechaVencimiento: l.fechaVencimiento ?? l.vencimiento ?? null,
            })),
        }));
    }
    if (Array.isArray(resp.resultados)) {
        return resp.resultados.map((r: any) => ({
            idPresentacion: Number(r.idPresentacion),
            idAlmacen: Number(r.idAlmacen),
            reservado: Number(r.cantidadProcesada ?? r.cantidad ?? 0),
            liberar: 0,
            selected: true,
            lotes: (r.lotes ?? []).map((l: any) => ({
                idLote: Number(l.idLote),
                cantidad: Number(l.cantidad ?? 0),
                numeroLote: l.numeroLote ?? null,
                fechaVencimiento: l.fechaVencimiento ?? l.vencimiento ?? null,
            })),
        }));
    }
    return [];
}

export default function LiberarReservaModal({
                                                idAnticipo,
                                                onClose,
                                                onDone,
                                            }: {
    idAnticipo: number;
    onClose?: () => void;
    onDone?: () => void;
}) {
    const [rows, setRows] = useState<CanonReservaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // etiquetas
    const [presMap, setPresMap] = useState<Record<number, PresInfo>>({});
    const [almMap, setAlmMap] = useState<Record<number, string>>({});

    async function fetchReservas() {
        setErr(null);
        setLoading(true);
        try {
            const resp = (anticiposService as any).reservasDetalle
                ? await (anticiposService as any).reservasDetalle(idAnticipo)
                : (anticiposService as any).reservasVigentes
                    ? await (anticiposService as any).reservasVigentes(idAnticipo)
                    : await (anticiposService as any).verReservas(idAnticipo);

            const canon = toCanonReservas(resp);
            setRows(canon);
            await enrichLabels(canon);
        } catch (e: any) {
            setRows([]);
            setErr(e?.response?.data?.message || e?.message || "No se pudo cargar reservas");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchReservas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idAnticipo]);

    async function enrichLabels(canon: CanonReservaItem[]) {
        const presIds = Array.from(new Set(canon.map((x) => x.idPresentacion)));
        const almIds = Array.from(new Set(canon.map((x) => x.idAlmacen)));

        const missingPres = presIds.filter((id) => presMap[id] === undefined);
        if (missingPres.length > 0) {
            const pairs = await Promise.all(
                missingPres.map(async (pid) => {
                    try {
                        const p: any = await presentacionService.get(pid);
                        // intentar múltiples nombres que pueda devolver tu backend
                        const producto =
                            p?.nombreProducto ??
                            p?.productoNombre ??
                            p?.producto?.nombre ??
                            p?.producto ??
                            p?.nombre ??
                            undefined;
                        const present =
                            p?.nombrePresentacion ??
                            p?.presentacion ??
                            p?.textoPresentacion ??
                            p?.presentacionNombre ??
                            undefined;
                        const um = p?.unidad?.sigla ?? p?.unidadMedida ?? p?.unidad ?? undefined;
                        const sku = p?.codigoSku ?? p?.sku ?? undefined;
                        const label: PresInfo = {
                            presentacion: present || (sku ? `[${sku}]` : `Presentación #${pid}`),
                            producto: producto || undefined,
                            um: um || undefined,
                            sku: sku || undefined,
                        };
                        return [pid, label] as const;
                    } catch {
                        return [pid, { presentacion: `Presentación #${pid}` } as PresInfo] as const;
                    }
                })
            );
            setPresMap((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
        }

        const missingAlm = almIds.filter((id) => almMap[id] === undefined);
        if (missingAlm.length > 0) {
            try {
                const opts = await almacenService.options({ soloActivos: true });
                const map: Record<number, string> = {};
                for (const id of missingAlm) map[id] = opts.find((o: any) => o.id === id)?.nombre ?? `Almacén #${id}`;
                setAlmMap((prev) => ({ ...prev, ...map }));
            } catch {
                const fallback: Record<number, string> = {};
                for (const id of missingAlm) fallback[id] = `Almacén #${id}`;
                setAlmMap((prev) => ({ ...prev, ...fallback }));
            }
        }
    }

    // total solo considera filas seleccionadas
    const totalLiberar = useMemo(
        () => rows.reduce((acc, r) => acc + (r.selected ? Number(r.liberar || 0) : 0), 0),
        [rows]
    );

    // permite hasta reservar (incluido)
    function setLiberar(idx: number, v: number) {
        setRows((xs) =>
            xs.map((r, i) =>
                i === idx
                    ? {
                        ...r,
                        liberar: Math.max(0, Math.min(Number.isFinite(v) ? v : 0, r.reservado)),
                        selected: Number.isFinite(v) && v > 0 ? true : r.selected,
                    }
                    : r
            )
        );
    }

    function toggleSelected(idx: number, val?: boolean) {
        setRows((xs) => xs.map((r, i) => (i === idx ? { ...r, selected: val ?? !r.selected } : r)));
    }

    async function submit() {
        setErr(null);
        const items = rows
            .filter((r) => r.selected && Number(r.liberar) > 0)
            .map((r) => ({ idPresentacion: r.idPresentacion, idAlmacen: r.idAlmacen, cantidad: Number(r.liberar) }));

        if (items.length === 0) {
            setErr("Indica al menos una cantidad a liberar.");
            return;
        }

        try {
            setSaving(true);
            await (anticiposService as any).liberarReserva(idAnticipo, { items });
            await fetchReservas();
            onDone?.();
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo liberar la reserva");
        } finally {
            setSaving(false);
        }
    }

    /** Intentar liberar todo usando el endpoint específico; si falla, fallback por items */
    async function handleLiberarTodo() {
        if (!confirm("¿Liberar todas las reservas de este anticipo?")) return;
        setErr(null);
        setSaving(true);
        try {
            // intentar endpoint dedicado
            if ((anticiposService as any).liberarTodasLasReservas) {
                const res = await (anticiposService as any).liberarTodasLasReservas(idAnticipo);
                // éxito
                await fetchReservas();
                onDone?.();
                setSaving(false);
                // informar al usuario
                alert(`Se liberaron ${res.totalLiberado ?? 0} unidades (lotes procesados: ${res.lotesProcesados ?? 0}).`);
                return;
            }
            // si no existe el método, caemos al fallback
            throw new Error("Endpoint liberarTodasLasReservas no disponible");
        } catch (e: any) {
            // si falla el endpoint dedicado, intentamos fallback liberando por items
            try {
                // construir payload liberando todo reservado
                const items = rows
                    .map((r) => ({ idPresentacion: r.idPresentacion, idAlmacen: r.idAlmacen, cantidad: Number(r.reservado) }))
                    .filter((it) => it.cantidad > 0);
                if (items.length === 0) {
                    setErr("No hay cantidades para liberar.");
                    setSaving(false);
                    return;
                }
                await (anticiposService as any).liberarReserva(idAnticipo, { items });
                await fetchReservas();
                onDone?.();
                setSaving(false);
                alert(`Se liberaron ${items.reduce((a, b) => a + b.cantidad, 0)} unidades (por items).`);
                return;
            } catch (e2: any) {
                // ambos fallaron
                console.error(e, e2);
                setErr(e2?.response?.data?.message || e2?.message || e?.response?.data?.message || e?.message || "No se pudo liberar todas las reservas");
                setSaving(false);
            }
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-background-dark rounded-xl shadow-xl w-[980px] max-w-[96vw]">
                {/* Header - título más pequeño (text-2xl) y close */}
                <div className="flex flex-wrap justify-between gap-3 p-4 items-start">
                    <p className="text-black bg-black:text-slate-50 text-2xl font-bold leading-tight tracking-[-0.01em] min-w-72">
                        Liberar Productos Reservados
                    </p>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center h-10 w-10 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-2 dark:focus:ring-offset-background-dark"
                        title="Cerrar"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="px-4 py-3">
                    <div className="flex overflow-hidden rounded-lg border border-[#dbe0e6] dark:border-slate-700 bg-white dark:bg-background-dark">
                        <table className="flex-1 w-full">
                            <thead className="border-b border-[#dbe0e6] dark:border-slate-700">
                            <tr className="bg-white dark:bg-background-dark">
                                {/* spacer for row checkboxes */}
                                <th className="px-4 py-3 w-16" />
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-auto text-sm font-medium leading-normal">Nombre</th>
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-[15%] text-sm font-medium leading-normal">SKU</th>
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-[10%] text-sm font-medium leading-normal">Almacén</th>
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-[10%] text-sm font-medium leading-normal">Lote</th>
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-[10%] text-sm font-medium leading-normal">Vencimiento</th>
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-[15%] text-sm font-medium leading-normal">Cantidad Reservada</th>
                                <th className="px-4 py-3 text-left text-black/70 dark:text-slate-500 w-[15%] text-sm font-medium leading-normal">Cantidad a Liberar</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-neutral-600">Cargando reservas…</td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-neutral-600">No hay reservas vigentes.</td>
                                </tr>
                            ) : (
                                rows.map((r, i) => {
                                    const pres = presMap[r.idPresentacion];
                                    const alm = almMap[r.idAlmacen];
                                    // construir Nombre: Producto · Presentación (si producto existe)
                                    const nombre = pres?.producto ? `${pres.producto}${pres.presentacion ? ` · ${pres.presentacion}` : ""}` : pres?.presentacion ?? `Presentación #${r.idPresentacion}`;
                                    const sku = pres?.sku ?? "—";
                                    return (
                                        <tr key={`${r.idPresentacion}-${r.idAlmacen}-${i}`} className="border-t border-t-[#dbe0e6] dark:border-slate-700">
                                            {/* checkbox cell (solo filas) */}
                                            <td className="h-[72px] px-4 py-2 w-16 text-center text-sm font-normal leading-normal">
                                                <input
                                                    type="checkbox"
                                                    checked={!!r.selected}
                                                    onChange={() => toggleSelected(i)}
                                                    className="h-5 w-5 rounded border-[#dbe0e6] dark:border-slate-600 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-primary/50"
                                                />
                                            </td>

                                            <td className="h-[72px] px-4 py-2 text-black dark:text-slate-50 text-sm font-medium leading-normal">
                                                {nombre}
                                                <div className="text-xs text-neutral-500">{pres?.sku ? `Pres.: ${pres.presentacion}` : (pres?.presentacion ? `Pres.: ${pres.presentacion}` : "")}</div>
                                            </td>

                                            <td className="h-[72px] px-4 py-2 text-black text-sm font-normal leading-normal">{sku}</td>

                                            <td className="h-[72px] px-4 py-2 text-black text-sm font-normal leading-normal">{alm ?? `Almacén #${r.idAlmacen}`}</td>

                                            <td className="h-[72px] px-4 py-2 text-black text-sm font-normal leading-normal">
                                                {r.lotes?.[0]?.numeroLote ?? `L-${String(r.lotes?.[0]?.idLote ?? "").padStart(4, "0")}`}
                                            </td>

                                            <td className="h-[72px] px-4 py-2 text-black text-sm font-normal leading-normal">
                                                {r.lotes?.[0]?.fechaVencimiento ? new Date(r.lotes[0].fechaVencimiento!).toLocaleDateString("es-BO") : "—"}
                                            </td>

                                            <td className="h-[72px] px-4 py-2 text-black text-sm font-normal leading-normal">
                                                {fmtNum(r.reservado)}
                                            </td>

                                            <td className="h-[72px] px-4 py-2">
                                                <input
                                                    className={clsx(
                                                        "form-input h-10 w-24 rounded-lg border-[#dbe0e6] dark:border-slate-600 bg-white text-black text-sm focus:border-primary focus:ring-primary/50"
                                                    )}
                                                    type="number"
                                                    min={0}
                                                    max={r.reservado}
                                                    value={String(r.liberar)}
                                                    onChange={(e) => {
                                                        const raw = e.target.value || "0";
                                                        const v = Number(raw.includes(",") ? raw.replace(",", ".") : raw);
                                                        // clamp to [0, reservado] — permite liberar todo lo reservado
                                                        const capped = Number.isFinite(v) ? Math.max(0, Math.min(v, r.reservado)) : 0;
                                                        setLiberar(i, capped);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mt-4">
                    <h3 className="text-black bg-black:text-slate-100 tracking-light text-xl font-bold leading-tight text-left">
                        Total de Productos a Liberar: {fmtNum(totalLiberar)}
                    </h3>

                    <div className="flex items-center gap-4">
                        {/* Botón cancelar rojo */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 h-12 px-6 bg-rose-600 text-white font-medium rounded-lg text-base shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:ring-offset-2"
                        >
                            Cancelar
                        </button>

                        {/* Botón liberar todo */}
                        <button
                            type="button"
                            onClick={handleLiberarTodo}
                            className={clsx(
                                "flex items-center justify-center gap-2 h-12 px-5 bg-yellow-500 text-white font-medium rounded-lg text-base shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:ring-offset-2",
                                saving && "opacity-60 cursor-not-allowed"
                            )}
                            disabled={saving}
                        >
                            {saving ? "Procesando…" : "Liberar todo"}
                        </button>

                        {/* Botón confirmar verde */}
                        <button
                            className={clsx(
                                "flex items-center justify-center gap-2 h-12 px-6 bg-emerald-600 text-white font-medium rounded-lg text-base shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2",
                                (saving || totalLiberar <= 0) && "opacity-60 cursor-not-allowed"
                            )}
                            disabled={saving || totalLiberar <= 0}
                            onClick={submit}
                        >
                            {saving ? "Liberando…" : "Confirmar Liberación"}
                        </button>
                    </div>
                </div>

                {err && <div className="p-4 text-sm text-rose-600">{err}</div>}
            </div>
        </div>
    );
}
