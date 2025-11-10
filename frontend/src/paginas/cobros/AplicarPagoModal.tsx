import { useEffect, useMemo, useRef, useState } from "react";
import { cobrosService } from "@/servicios/cobros";
import { http } from "@/servicios/httpClient";
import { ventasService } from "@/servicios/ventas";
import type {
    CxcItem,
    MetodoDePago,
    PagoCrearDTO,
    PagoAplicarDTO,
} from "@/types/cobros";

type Moneda = { idMoneda: number; codigo: string; nombre?: string; simbolo?: string };

type VentaMini = {
    tipoDocumentoTributario?: "factura" | "boleta" | string | null;
    numeroDocumento?: string | null;
    totalNetoBob?: number | null;
};

export function AplicarPagoModal({
                                     cuentas,
                                     onClose,
                                     onDone,
                                 }: {
    cuentas: CxcItem[];
    onClose: () => void;
    onDone?: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);

    // --- cerrar al click fuera y con ESC ---
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        function onDoc(ev: MouseEvent) {
            if (saving) return;
            if (cardRef.current && !cardRef.current.contains(ev.target as Node)) onClose();
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [onClose, saving]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !saving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, saving]);

    // --- monedas (fallback si falla endpoint) ---
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    useEffect(() => {
        (async () => {
            try {
                const arr = await http.get<any[]>("/v1/monedas");
                setMonedas(
                    (arr ?? []).map((m) => ({
                        idMoneda: m.idMoneda ?? m.id,
                        codigo: String(m.codigo ?? m.simbolo ?? m.nombre ?? m.idMoneda).toUpperCase(),
                        nombre: m.nombre,
                        simbolo: m.simbolo,
                    }))
                );
            } catch {
                setMonedas([
                    { idMoneda: 1, codigo: "BOB" },
                    { idMoneda: 2, codigo: "USD" },
                ]);
            }
        })();
    }, []);

    // --- formulario (simplificado) ---
    const [idMoneda, setIdMoneda] = useState<number>(1);
    const [montoMoneda, setMontoMoneda] = useState<number>(0);
    const [metodoDePago, setMetodoDePago] = useState<MetodoDePago>("transferencia");
    const [referenciaExterna, setReferenciaExterna] = useState<string>("");// se mantiene pero no se expone
    const [errores, setErrores] = useState<string | null>(null);

    const codigoMonedaActual = useMemo(
        () => (monedas.find((m) => m.idMoneda === idMoneda)?.codigo ?? "").toUpperCase(),
        [monedas, idMoneda]
    );
    const esBOB = codigoMonedaActual === "BOB";

    // info de ventas para FAC/BOL y total
    const [ventasInfo, setVentasInfo] = useState<Record<number, VentaMini>>({});
    useEffect(() => {
        let alive = true;
        (async () => {
            const ids = Array.from(new Set(cuentas.map((c) => c.idVenta))).filter(
                (id) => ventasInfo[id] === undefined
            );
            for (const id of ids) {
                try {
                    const det: any = await ventasService.detalle(id);
                    if (!alive) return;
                    setVentasInfo((prev) => ({
                        ...prev,
                        [id]: {
                            tipoDocumentoTributario:
                                det?.tipoDocumentoTributario ?? det?.header?.tipoDocumentoTributario ?? null,
                            numeroDocumento: det?.numeroDocumento ?? det?.header?.numeroDocumento ?? null,
                            totalNetoBob: det?.totalNetoBob ?? det?.totales?.totalNetoBob ?? null,
                        },
                    }));
                } catch {
                    if (!alive) return;
                    setVentasInfo((prev) => ({ ...prev, [id]: {} }));
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, [cuentas, ventasInfo]);

    // pendientes
    const totalPendienteSel = useMemo(
        () => cuentas.reduce((acc, c) => acc + (Number(c.montoPendienteBob) || 0), 0),
        [cuentas]
    );

    // clamp al escribir: no negativos, no NaN, no más que pendiente cuando es BOB
    function onMontoChange(vRaw: string) {
        let v = Number(vRaw);
        if (!Number.isFinite(v) || v <= 0) v = 0; // evita negativos y "-0"
        if (esBOB) v = Math.min(v, totalPendienteSel);
        setMontoMoneda(v);
    }
    function blockBadKeys(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (["e", "E", "+", "-"].includes(ev.key)) ev.preventDefault();
    }

    // helpers visuales
    function ventaDisplay(c: CxcItem) {
        const info = ventasInfo[c.idVenta] || {};
        const nro = (info as any)?.numeroDocumento;

        if (nro != null && String(nro).trim() !== "") {
            return String(nro);
        }
        return String(c.idVenta).padStart(6, "0");
    }

    function totalDeVenta(c: CxcItem) {
        const info = ventasInfo[c.idVenta] || {};
        const t = Number(info.totalNetoBob);
        if (!Number.isNaN(t) && t > 0) return t;
        return Number(c.montoPendienteBob) || 0;
    }

    // submit: distribuir automáticamente el monto (si es BOB) entre las CxC en orden
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrores(null);

        if (!idMoneda) return setErrores("Selecciona la moneda.");
        if (!montoMoneda || montoMoneda <= 0) return setErrores("Ingresa el monto recibido (> 0).");
        if (esBOB && montoMoneda > totalPendienteSel) {
            return setErrores("El monto recibido (BOB) no puede exceder el pendiente total.");
        }

        // construir aplicaciones: repartir en orden
        let restante = esBOB ? montoMoneda : montoMoneda; // si hubiera multi-moneda, acá convertirías
        const aplicaciones: Array<{ idCuentaCobrar: number; montoAplicadoBob: number }> = [];
        for (const c of cuentas) {
            const pend = Math.max(0, Number(c.montoPendienteBob) || 0);
            if (pend <= 0 || restante <= 0) {
                aplicaciones.push({ idCuentaCobrar: c.idCuentaCobrar, montoAplicadoBob: 0 });
                continue;
            }
            const aplicar = Math.min(pend, restante);
            aplicaciones.push({ idCuentaCobrar: c.idCuentaCobrar, montoAplicadoBob: aplicar });
            restante -= aplicar;
            if (restante <= 0) break;
        }

        // filtra ceros
        const apps = aplicaciones.filter((a) => a.montoAplicadoBob > 0);
        if (apps.length === 0) return setErrores("El monto no cubre ninguna cuenta seleccionada.");

        try {
            setSaving(true);

            const dto: PagoCrearDTO = {
                idMoneda,
                montoMoneda,
                metodoDePago,
                referenciaExterna: referenciaExterna?.trim() || undefined,
                aplicaACuenta: true,
                aplicaciones: apps,
                montoBobEquivalente: esBOB ? montoMoneda : undefined,
            };

            const r = await cobrosService.crearPago(dto);

            if (!r.aplicado) {
                const dtoAp: PagoAplicarDTO = {
                    items: apps.map((it) => ({
                        idCuentaCobrar: it.idCuentaCobrar,
                        montoAplicadoBob: it.montoAplicadoBob,
                    })),
                };
                await cobrosService.aplicarPago(r.idPagoRecibido, dtoAp);
            }

            onDone?.();
            onClose();
        } catch (e: any) {
            setErrores(e?.response?.data?.message || e?.message || "No se pudo aplicar el pago");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
                ref={cardRef}
                className="w-full max-w-2xl bg-white rounded-xl shadow-lg flex flex-col"
                role="dialog"
                aria-modal
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Aplicar Pago</h2>
                    <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => !saving && onClose()}
                        aria-label="Cerrar"
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6 flex-grow space-y-6">
                    {errores && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                            {errores}
                        </div>
                    )}

                    {/* 2x2 campos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                            <div className="relative">
                                <select
                                    className="w-full h-10 px-3 pr-8 rounded-lg border bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                    value={idMoneda}
                                    onChange={(e) => setIdMoneda(Number(e.target.value))}
                                >
                                    {monedas.map((m) => (
                                        <option key={m.idMoneda} value={m.idMoneda}>
                                            {m.codigo} {m.nombre ? `(${m.nombre})` : ""}
                                        </option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Monto recibido {esBOB ? "(BOB)" : `(${codigoMonedaActual || ""})`}
                            </label>
                            <input
                                className="w-full h-10 px-3 rounded-lg border bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                type="number"
                                min="0"
                                step="0.01"
                                max={esBOB ? totalPendienteSel : undefined}
                                onKeyDown={blockBadKeys}
                                value={montoMoneda}
                                onChange={(e) => onMontoChange(e.target.value)}
                            />
                            {esBOB && (
                                <div className="text-xs text-gray-500 mt-1">
                                    Pendiente total: {totalPendienteSel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BOB
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                            <div className="relative">
                                <select
                                    className="w-full h-10 px-3 pr-8 rounded-lg border bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                    value={metodoDePago}
                                    onChange={(e) => setMetodoDePago(e.target.value as MetodoDePago)}
                                >
                                    <option value="transferencia">Transferencia</option>
                                    <option value="efectivo">Efectivo</option>
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Referencia externa <span className="text-gray-400">(opcional)</span>
                            </label>
                            <input
                                className="w-full h-10 px-3 rounded-lg border bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Añadir un comentario"
                                type="text"
                                value={referenciaExterna}
                                onChange={(e) => setReferenciaExterna(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Detalles de la venta (solo lectura) */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Detalles de la Venta</h3>
                        <div className="overflow-x-auto bg-gray-50 rounded-lg border border-gray-200">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Venta</th>
                                    <th className="px-4 py-2 font-medium">Cliente</th>
                                    <th className="px-4 py-2 font-medium text-right">Total (Bs)</th>
                                    <th className="px-4 py-2 font-medium text-right">Pendiente (Bs)</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {cuentas.map((c) => {
                                    const tot = totalDeVenta(c);
                                    const pend = Number(c.montoPendienteBob) || 0;
                                    return (
                                        <tr key={c.idCuentaCobrar}>
                                            <td className="px-4 py-3 font-medium text-blue-600">{ventaDisplay(c)}</td>
                                            <td className="px-4 py-3">{c.cliente ?? c.idCliente}</td>
                                            <td className="px-4 py-3 text-right">
                                                {tot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold">
                                                {pend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {cuentas.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-4 text-gray-500" colSpan={4}>
                                            Sin cuentas seleccionadas
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end items-center gap-3 bg-gray-100 rounded-b-xl">
                    <button
                        className="flex items-center justify-center rounded-lg h-10 px-4 bg-gray-200 text-gray-900 hover:bg-gray-300"
                        type="button"
                        onClick={() => !saving && onClose()}
                    >
                        Cancelar
                    </button>
                    <button
                        className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        type="button"
                        onClick={() => {
                            const form = cardRef.current?.querySelector("form") as HTMLFormElement | null;
                            form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                        }}
                        disabled={
                            saving ||
                            !montoMoneda ||
                            montoMoneda <= 0 ||
                            (esBOB && montoMoneda > totalPendienteSel)
                        }
                        title={
                            !montoMoneda || montoMoneda <= 0
                                ? "Ingresa un monto mayor a 0."
                                : esBOB && montoMoneda > totalPendienteSel
                                    ? "El monto recibido supera el pendiente total."
                                    : "Aplicar pago"
                        }
                    >
                        <span className="material-symbols-outlined">payment</span>
                        <span>Aplicar Pago</span>
                    </button>
                </div>

                {saving && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
                        <div className="animate-pulse text-blue-700 font-medium">Procesando…</div>
                    </div>
                )}
            </div>
        </div>
    );
}
