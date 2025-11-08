import { useEffect, useMemo, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import { ClienteService } from "@/servicios/cliente";
import { presentacionService } from "@/servicios/presentacion";
import { almacenService } from "@/servicios/almacen";
import { saveVentaDraftFromAnticipo } from "@/servicios/ventaDraft";
import type { Anticipo, AplicacionAnticipoItem, PageAplicacionAnticipo } from "@/types/anticipos";

/* ============== utils ============== */
const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-BO") : "-");
const pad4 = (n: number) => String(n).padStart(4, "0");
const anticipoCode = (id?: number | null) => (id ? `ANT${String(id).padStart(3, "0")}` : "ANT—");

function estadoBadge(e?: string) {
    switch (e) {
        case "parcialmente_aplicado": return { text: "parcialmente aplicado", cls: "bg-amber-100 text-amber-800" };
        case "aplicado_total":        return { text: "aplicado total",       cls: "bg-emerald-100 text-emerald-800" };
        case "anulado":               return { text: "anulado",              cls: "bg-rose-100 text-rose-800" };
        case "registrado":
        default:                      return { text: "registrado",           cls: "bg-slate-100 text-slate-700" };
    }
}

/** Lee id por prop → QS/hash/path (sin react-router) */
function resolveAnticipoId(idProp?: number): number {
    if (Number.isFinite(idProp) && (idProp as number) > 0) return idProp as number;

    if (typeof window === "undefined") return NaN;
    const s = new URLSearchParams(window.location.search);
    const q = s.get("id") || s.get("anticipoId") || s.get("aid");
    if (q && /^\d+$/.test(q)) return Number(q);

    const h = window.location.hash || "";
    const idx = h.indexOf("?");
    if (idx >= 0) {
        const qs = new URLSearchParams(h.slice(idx + 1));
        const v = qs.get("id") || qs.get("anticipoId") || qs.get("aid");
        if (v && /^\d+$/.test(v)) return Number(v);
    }

    const rx = /anticipos(?:\/detalle)?\/(\d+)(?:\/|$)/i;
    const m1 = (window.location.pathname || "").match(rx);
    if (m1?.[1]) return Number(m1[1]);
    const m2 = (window.location.hash || "").match(rx);
    if (m2?.[1]) return Number(m2[1]);

    return NaN;
}

/* ============== tipos locales ============== */
type PresInfo = {
    producto?: string;           // preferido para la columna “Nombre”
    presentacion: string;
    um?: string;
    sku?: string;
    precioBob?: number | null;
    precioPorAlmacen?: Record<number, number | null>;
};

type CanonReservaItem = {
    idPresentacion: number;
    idAlmacen: number;
    cantidad: number;
    lotes: Array<{
        idLote: number;
        cantidad: number;
        numeroLote?: string | null;
        fechaVencimiento?: string | null;
    }>;
};

/* ============== componente ============== */
export default function AnticipoDetalle({ idAnticipo: idProp }: { idAnticipo?: number }) {
    const idAnticipo = resolveAnticipoId(idProp);
    if (!Number.isFinite(idAnticipo) || idAnticipo <= 0) {
        return <div className="p-4">URL inválida o falta el ID del anticipo.</div>;
    }

    const [ant, setAnt] = useState<Anticipo | null>(null);
    const [clienteNombre, setClienteNombre] = useState<string>("");
    const [reservas, setReservas] = useState<CanonReservaItem[]>([]);
    const [presMap, setPresMap] = useState<Record<number, PresInfo>>({});
    const [almMap, setAlmMap] = useState<Record<number, string>>({});

    const [apps, setApps] = useState<AplicacionAnticipoItem[]>([]);
    const [appsPage, setAppsPage] = useState(0);
    const [appsTotalPages, setAppsTotalPages] = useState(1);
    const [appsSize] = useState(20);

    const [, setLoading] = useState(false);
    const [, setErr] = useState<string | null>(null);

    const aplicadoAcumulado = useMemo(
        () => apps.reduce((acc, it) => acc + (it.montoAplicadoBob ?? 0), 0),
        [apps]
    );
    const saldo = useMemo(() => Math.max(0, (ant?.montoBob ?? 0) - aplicadoAcumulado), [ant?.montoBob, aplicadoAcumulado]);

    /* ---------- loaders ---------- */
    async function fetchAnticipo() {
        const r = await anticiposService.obtener(idAnticipo);
        setAnt(r);
        if (r?.idCliente) {
            try {
                const c = await ClienteService.obtener(r.idCliente);
                const nom =
                    (c as any)?.razonSocialONombre ??
                    (c as any)?.razonSocial ??
                    (c as any)?.nombreCliente ??
                    (c as any)?.nombre ??
                    `#${r.idCliente}`;
                setClienteNombre(nom);
            } catch {
                setClienteNombre(`#${r.idCliente}`);
            }
        } else {
            setClienteNombre("-");
        }
    }

    /** Normaliza cualquier forma de respuesta a CanonReservaItem[] */
    function toCanonReservas(resp: any): CanonReservaItem[] {
        if (!resp) return [];

        // Forma “detalle” oficial
        if (Array.isArray(resp.resultados)) {
            return resp.resultados.map((r: any) => ({
                idPresentacion: Number(r.idPresentacion),
                idAlmacen: Number(r.idAlmacen),
                cantidad: Number(r.cantidadProcesada ?? r.cantidad ?? 0),
                lotes: (r.lotes ?? []).map((l: any) => ({
                    idLote: Number(l.idLote),
                    cantidad: Number(l.cantidad ?? 0),
                    numeroLote: l.numeroLote ?? null,
                    fechaVencimiento: l.fechaVencimiento ?? l.vencimiento ?? null,
                })),
            }));
        }

        // Forma “simple/legacy”
        if (Array.isArray(resp.items)) {
            return resp.items.map((it: any) => ({
                idPresentacion: Number(it.idPresentacion),
                idAlmacen: Number(it.idAlmacen),
                cantidad: Number(it.total ?? it.cantidad ?? 0),
                lotes: (it.lotes ?? []).map((l: any) => ({
                    idLote: Number(l.idLote),
                    cantidad: Number(l.cantidad ?? 0),
                    numeroLote: l.numeroLote ?? null,
                    fechaVencimiento: l.fechaVencimiento ?? l.vencimiento ?? null,
                })),
            }));
        }

        return [];
    }

    /** Trae **detalle** primero para obtener numeroLote real; cae a vigentes si no existe */
    async function fetchReservas() {
        try {
            let resp: any = null;

            // Preferimos endpoints “detalle” (traen numeroLote y vencimiento)
            if ((anticiposService as any).reservasDetalle) {
                resp = await (anticiposService as any).reservasDetalle(idAnticipo);
            } else if ((anticiposService as any).verReservasDetalle) {
                resp = await (anticiposService as any).verReservasDetalle(idAnticipo);
            } else {
                // Fallbacks sin detalle
                resp = (anticiposService as any).reservasVigentes
                    ? await (anticiposService as any).reservasVigentes(idAnticipo)
                    : await (anticiposService as any).verReservas(idAnticipo);
            }

            const canon = toCanonReservas(resp);
            setReservas(canon);
            await enrichLabels(canon);
        } catch {
            setReservas([]);
            setPresMap({});
            setAlmMap({});
        }
    }

    async function fetchAplicaciones(page = appsPage, size = appsSize) {
        const r: PageAplicacionAnticipo = await anticiposService.listarAplicacionesPorAnticipo(idAnticipo, { page, size });
        setApps(r.content ?? []);
        setAppsPage(r.number ?? 0);
        setAppsTotalPages(r.totalPages ?? 1);
    }

    async function fetchAll() {
        try {
            setLoading(true);
            setErr(null);
            await Promise.all([fetchAnticipo(), fetchReservas(), fetchAplicaciones(0, appsSize)]);
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo cargar el anticipo");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idAnticipo]);

    /* ---------- enriquecimiento nombres / precios ---------- */
    async function enrichLabels(canon: CanonReservaItem[]) {
        if (!canon || canon.length === 0) return;

        const presIds = Array.from(new Set(canon.map((x) => x.idPresentacion)));
        const almIds  = Array.from(new Set(canon.map((x) => x.idAlmacen)));

        // Presentaciones (producto / presentación / sku / precio genérico)
        const missingPres = presIds.filter((id) => presMap[id] === undefined);
        if (missingPres.length > 0) {
            const pairs = await Promise.all(
                missingPres.map(async (pid) => {
                    try {
                        const p: any = await presentacionService.get(pid);
                        const producto =
                            p?.nombreProducto ??
                            p?.productoNombre ??
                            p?.producto_nombre ??
                            p?.producto?.nombre ??
                            p?.producto ??
                            undefined;

                        const present =
                            p?.nombrePresentacion ??
                            p?.presentacionNombre ??
                            p?.presentacion ??
                            p?.textoPresentacion ??
                            undefined;

                        const um  = p?.unidad?.sigla ?? p?.unidadMedida ?? p?.unidad ?? undefined;
                        const sku = p?.codigoSku ?? p?.sku ?? undefined;

                        const rawPrice = p?.precioBob ?? p?.precioVenta ?? p?.precio ?? p?.precioBase ?? null;
                        const price = Number(rawPrice);
                        const precioBob = Number.isFinite(price) ? price : null;

                        const label: PresInfo = {
                            producto: producto || undefined,
                            presentacion: present || (sku ? `[${sku}]` : `Presentación #${pid}`),
                            um: um || undefined,
                            sku: sku || undefined,
                            precioBob,
                        };
                        return [pid, label] as const;
                    } catch {
                        return [pid, { presentacion: `Presentación #${pid}` } as PresInfo] as const;
                    }
                })
            );
            setPresMap((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
        }

        // Almacenes (nombres)
        const missingAlm = almIds.filter((id) => almMap[id] === undefined);
        if (missingAlm.length > 0) {
            try {
                const opts = await almacenService.options();
                const map: Record<number, string> = {};
                for (const id of missingAlm) {
                    const hit = opts.find((o) => o.id === id);
                    map[id] = hit?.nombre ?? `Almacén #${id}`;
                }
                setAlmMap((prev) => ({ ...prev, ...map }));
            } catch {
                const fallback: Record<number, string> = {};
                for (const id of missingAlm) fallback[id] = `Almacén #${id}`;
                setAlmMap((prev) => ({ ...prev, ...fallback }));
            }
        }

        // Precios por almacén **y** (si el endpoint los trae) nombres de producto/presentación
        const byAlm = new Map<number, number[]>();
        for (const r of canon) {
            const arr = byAlm.get(r.idAlmacen) ?? [];
            if (!arr.includes(r.idPresentacion)) arr.push(r.idPresentacion);
            byAlm.set(r.idAlmacen, arr);
        }

        for (const [idAlm, presList] of byAlm.entries()) {
            try {
                const r = await (almacenService as any).listarPresentaciones(idAlm, {
                    page: 0,
                    size: Math.max(200, presList.length),
                    soloConStock: false,
                });
                const content: Array<any> = r?.content ?? [];
                setPresMap((prev) => {
                    const next = { ...prev };
                    for (const it of content) {
                        const pid = Number(it.idPresentacion ?? it.id);
                        if (!presList.includes(pid)) continue;

                        const precio = typeof it?.precioBob === "number" ? it.precioBob : null;
                        const cur = next[pid] ?? { presentacion: `Presentación #${pid}` };

                        next[pid] = {
                            ...cur,
                            // si el endpoint ya trae nombres, aprovechemos para rellenar
                            producto: cur.producto ?? it?.productoNombre ?? it?.nombreProducto ?? it?.producto ?? cur.producto,
                            presentacion:
                                cur.presentacion ??
                                it?.presentacionNombre ??
                                it?.nombrePresentacion ??
                                it?.presentacion ??
                                cur.presentacion,
                            sku: cur.sku ?? it?.sku ?? it?.codigoSku ?? cur.sku,
                            precioPorAlmacen: { ...(cur.precioPorAlmacen ?? {}), [idAlm]: precio },
                        };
                    }
                    return next;
                });
            } catch {
                /* sin precio/nombres por este almacén */
            }
        }
    }

    /* ---------- convertir a venta ---------- */
    async function handleConvertirAVenta() {
        if (!ant) return;
        if (ant.estadoAnticipo === "anulado") {
            alert("Este anticipo está anulado.");
            return;
        }
        if (!ant.idCliente) {
            alert("Este anticipo no tiene cliente asociado. No se puede convertir a venta.");
            return;
        }
        if (!reservas || reservas.length === 0) {
            alert("No hay reservas vigentes para convertir.");
            return;
        }
        const idAlmacenDespacho = reservas[0]?.idAlmacen;

        const items = reservas
            .filter((r) => (r?.cantidad ?? 0) > 0)
            .map((r) => ({
                idPresentacion: r.idPresentacion,
                cantidad: r.cantidad,
                idAlmacenOrigen: r.idAlmacen,
                lotes: r.lotes?.map((l) => ({ idLote: l.idLote, cantidad: l.cantidad })) ?? undefined,
            }));

        saveVentaDraftFromAnticipo(idAnticipo, {
            idCliente: ant.idCliente,
            idAlmacenDespacho,
            items,
            aplicarAnticipoAuto: true,
            saldoAnticipoBob: saldo,
        });

        // Navegación sin react-router
        window.location.assign(`/ventas/nueva?from=anticipo&id=${idAnticipo}`);
    }

    /* ---------- filas de la tabla ---------- */
    const reservaRows = useMemo(() => {
        type Row = {
            key: string;
            nombre: string;
            sku?: string | null;
            almacen: string;
            lote?: string | null;
            venc?: string | null;
            cantidad: number;
            precio?: number | null;
            total?: number | null;
        };
        const rows: Row[] = [];

        reservas.forEach((r, i) => {
            const p = presMap[r.idPresentacion];

            const nombre =
                p?.producto ??
                p?.presentacion ??
                (p?.sku ? `[${p.sku}]` : `Presentación #${r.idPresentacion}`);

            const sku = p?.sku ?? null;
            const almacen = almMap[r.idAlmacen] ?? `Almacén #${r.idAlmacen}`;

            const precio =
                p?.precioPorAlmacen?.[r.idAlmacen] ??
                (typeof p?.precioBob === "number" ? p.precioBob : null);

            if (r.lotes && r.lotes.length > 0) {
                r.lotes.forEach((l, j) => {
                    const cantidad = Number(l.cantidad || 0);
                    rows.push({
                        key: `${r.idPresentacion}-${r.idAlmacen}-${l.idLote}-${j}`,
                        nombre,
                        sku,
                        almacen,
                        lote: l.numeroLote ?? `L-${pad4(l.idLote)}`,
                        venc: l.fechaVencimiento ? new Date(l.fechaVencimiento).toLocaleDateString("es-BO") : "—",
                        cantidad,
                        precio,
                        total: precio != null ? precio * cantidad : null,
                    });
                });
            } else {
                const cantidad = Number(r.cantidad || 0);
                rows.push({
                    key: `${r.idPresentacion}-${r.idAlmacen}-${i}`,
                    nombre,
                    sku,
                    almacen,
                    lote: "—",
                    venc: "—",
                    cantidad,
                    precio,
                    total: precio != null ? precio * cantidad : null,
                });
            }
        });

        return rows;
    }, [reservas, presMap, almMap]);

    const totalReservaBob = useMemo(
        () => reservaRows.reduce((acc, it) => acc + (it.total ?? 0), 0),
        [reservaRows]
    );

    /* ============== render ============== */
    const badge = estadoBadge(ant?.estadoAnticipo);

    // ⚠️ sin contenedor “card” para evitar panel dentro de panel
    return (
        <div className="p-4 sm:p-6 md:p-8">
            {/* Encabezado */}
            <div className="relative pb-3 mb-4 border-b border-slate-2 00">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">DETALLE ANTICIPO</h1>
                        <div className="flex items-center gap-3 text-slate-600">
                            <span className="text-sm">Anticipo {anticipoCode(ant?.idAnticipo ?? idAnticipo)}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.text}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de acciones */}
            <div className="flex gap-3 flex-wrap pb-5">
                <button
                    onClick={handleConvertirAVenta}
                    disabled={!ant || (ant as any)?.estadoAnticipo === "anulado" || reservas.length === 0}
                    className="flex items-center gap-2 rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                    title={reservas.length === 0 ? "No hay reservas para convertir" : "Convertir a venta"}
                >
                    🛒 <span>Convertir a venta</span>
                </button>
            </div>

            {/* Datos del anticipo */}
            {ant && (
                <section className="space-y-1 mb-6">
                    <h2 className="text-slate-800 text-xl font-bold tracking-tight px-1 pb-2">Datos del Anticipo</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-6">
                        <div className="flex flex-col gap-1 border-t border-slate-200 py-4 lg:col-span-2">
                            <p className="text-slate-500 text-sm">Cliente</p>
                            <p className="text-slate-800 text-sm font-medium">
                                {clienteNombre || (ant.idCliente ? `#${ant.idCliente}` : "-")}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-slate-200 py-4">
                            <p className="text-slate-500 text-sm">Fecha Anticipo</p>
                            <p className="text-slate-800 text-sm font-medium">{fmtDateTime(ant.fechaAnticipo)}</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-slate-200 py-4">
                            <p className="text-slate-500 text-sm">Monto</p>
                            <p className="text-slate-800 text-sm font-medium">{fmtMoney(ant.montoBob)} BOB</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-slate-200 py-4">
                            <p className="text-slate-500 text-sm">Aplicado</p>
                            <p className="text-slate-800 text-sm font-medium">{fmtMoney(aplicadoAcumulado)} BOB</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-slate-200 py-4 lg:col-span-2">
                            <p className="text-slate-500 text-sm">Saldo</p>
                            <p className="text-green-600 text-sm font-bold">{fmtMoney(saldo)} BOB</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Reservas */}
            <section className="mb-8">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-lg font-semibold text-slate-800">Productos Reservados</h3>
                    <button className="text-sm text-blue-600 hover:underline" onClick={fetchReservas} title="Refrescar reservas">
                        Refrescar
                    </button>
                </div>

                {reservas.length === 0 ? (
                    <div className="mt-2 text-sm text-neutral-500 px-1">Sin reservas vigentes.</div>
                ) : (
                    <div className="mt-3 overflow-auto rounded-lg border border-slate-200">
                        <table className="min-w-[920px] w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2 text-left min-w-[140px]">Nombre</th>
                                <th className="px-4 py-2 text-left w-[120px]">SKU</th>
                                <th className="px-4 py-2 text-left w-[110px]">Almacén</th>
                                <th className="px-4 py-2 text-left w-[90px]">Lote</th>
                                <th className="px-4 py-2 text-left w-[100px]">Vencimiento</th>
                                <th className="px-4 py-2 text-right w-[60px]">Total reservado</th>
                                <th className="px-4 py-2 text-right w-[140px]">Precio</th>
                                <th className="px-4 py-2 text-right w-[140px]">Total</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white">
                            {reservaRows.map((r) => (
                                <tr key={r.key} className="border-t">
                                    <td className="px-4 py-2 text-slate-900">{r.nombre}</td>
                                    <td className="px-4 py-2">{r.sku ?? "—"}</td>
                                    <td className="px-4 py-2">{r.almacen}</td>
                                    <td className="px-4 py-2">{r.lote ?? "—"}</td>
                                    <td className="px-4 py-2">{r.venc ?? "—"}</td>
                                    <td className="px-4 py-2 text-right">{String(r.cantidad)}</td>
                                    <td className="px-4 py-2 text-right">
                                        {typeof r.precio === "number" ? `${fmtMoney(r.precio)} BOB` : "—"}
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium">
                                        {typeof r.total === "number" ? `${fmtMoney(r.total)} BOB` : "—"}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr className="bg-slate-50 text-slate-900 font-semibold">
                                <td className="px-4 py-3 text-right" colSpan={7}>Total de la reserva</td>
                                <td className="px-4 py-3 text-right">{fmtMoney(totalReservaBob)} BOB</td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </section>

            {/* Aplicaciones */}
            <section>
                <h2 className="text-slate-800 text-xl font-bold tracking-tight px-1 pb-3">Aplicaciones del Anticipo</h2>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th className="px-6 py-3">#</th>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Venta</th>
                            <th className="px-6 py-3 text-right">Monto aplicado</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white">
                        {apps.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-6 text-center text-slate-500">Sin aplicaciones aún.</td>
                            </tr>
                        ) : (
                            apps.map((a, idx) => (
                                <tr key={a.idAplicacionAnticipo} className="border-b last:border-0">
                                    <td className="px-6 py-4">{idx + 1 + appsPage * appsSize}</td>
                                    <td className="px-6 py-4">{fmtDateTime(a.fechaAplicacion)}</td>
                                    <td className="px-6 py-4">
                                        {a.idVenta ? (
                                            <a href={`/ventas/${a.idVenta}`} className="text-blue-600 hover:underline">
                                                VTA-{String(a.idVenta).padStart(4, "0")}
                                            </a>
                                        ) : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">{fmtMoney(a.montoAplicadoBob)} BOB</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                        className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => appsPage > 0 && fetchAplicaciones(appsPage - 1, appsSize)}
                        disabled={appsPage <= 0}>
                        ← Anterior
                    </button>
                    <span className="text-xs text-slate-600">
            Página {appsPage + 1} / {appsTotalPages}
          </span>
                    <button
                        className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => appsPage < appsTotalPages - 1 && fetchAplicaciones(appsPage + 1, appsSize)}
                        disabled={appsPage >= appsTotalPages - 1}>
                        Siguiente →
                    </button>
                </div>
            </section>
        </div>
    );
}
