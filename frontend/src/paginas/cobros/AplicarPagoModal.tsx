import { useEffect, useMemo, useRef, useState } from "react";
import { cobrosService } from "@/servicios/cobros";
import { http } from "@/servicios/httpClient";
import type {
    CxcItem,
    MetodoDePago,
    PagoCrearDTO,
    PagoAplicarDTO,
} from "@/types/cobros";

type Moneda = { idMoneda: number; codigo: string; nombre?: string; simbolo?: string };

export function AplicarPagoModal({
                                     cuentas,
                                     onClose,
                                     onDone,
                                 }: {
    cuentas: CxcItem[];              // puedes pasar 1 o varias CxC
    onClose: () => void;
    onDone?: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);

    // Cerrar al click afuera (protegido mientras guarda)
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        function onDoc(ev: MouseEvent) {
            if (saving) return;
            if (cardRef.current && !cardRef.current.contains(ev.target as Node)) onClose();
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [onClose, saving]);

    // Cerrar con Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !saving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, saving]);

    // Monedas (con fallback si el endpoint falla)
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

    // Formulario
    const [idMoneda, setIdMoneda] = useState<number>(1);
    const [montoMoneda, setMontoMoneda] = useState<number>(0);
    const [metodoDePago, setMetodoDePago] = useState<MetodoDePago>("efectivo");
    const [referenciaExterna, setReferenciaExterna] = useState<string>("");
    const [aplicaACuenta, setAplicaACuenta] = useState<boolean>(true);
    const [errores, setErrores] = useState<string | null>(null);

    // Editor de montos por CxC
    const pendientesPorCxc = useMemo(() => {
        const map: Record<number, number> = {};
        for (const c of cuentas) map[c.idCuentaCobrar] = Number(c.montoPendienteBob) || 0;
        return map;
    }, [cuentas]);

    const [montos, setMontos] = useState<Record<number, number>>(() => {
        const obj: Record<number, number> = {};
        for (const c of cuentas) obj[c.idCuentaCobrar] = Math.max(0, Number(c.montoPendienteBob) || 0);
        return obj;
    });

    const codigoMonedaActual = useMemo(
        () => (monedas.find((m) => m.idMoneda === idMoneda)?.codigo ?? "").toUpperCase(),
        [monedas, idMoneda]
    );
    const esBOB = codigoMonedaActual === "BOB";

    const totalAplicarBOB = useMemo(
        () => Object.values(montos).reduce((a, b) => a + (Number(b) || 0), 0),
        [montos]
    );

    const totalPendienteSel = useMemo(
        () => cuentas.reduce((acc, c) => acc + (Number(c.montoPendienteBob) || 0), 0),
        [cuentas]
    );

    const hayExcesoPorFila = useMemo(
        () =>
            cuentas.some((c) => (montos[c.idCuentaCobrar] ?? 0) > (pendientesPorCxc[c.idCuentaCobrar] ?? 0)),
        [cuentas, montos, pendientesPorCxc]
    );

    // Si la moneda es BOB, podemos comparar contra monto recibido
    const faltaSobra = esBOB ? (montoMoneda || 0) - totalAplicarBOB : null;

    function setMonto(idCxc: number, vRaw: string) {
        const v = Number(vRaw);
        const normal = v < 0 || Number.isNaN(v) ? 0 : v;
        setMontos((prev) => ({ ...prev, [idCxc]: normal }));
    }

    function blockBadKeys(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (["e", "E", "+", "-"].includes(ev.key)) ev.preventDefault();
    }

    // Acciones inteligentes
    function saldarTodo() {
        const next: Record<number, number> = {};
        for (const c of cuentas) next[c.idCuentaCobrar] = pendientesPorCxc[c.idCuentaCobrar] || 0;
        setMontos(next);
    }

    function limpiarMontos() {
        const next: Record<number, number> = {};
        for (const c of cuentas) next[c.idCuentaCobrar] = 0;
        setMontos(next);
    }

    function distribuirHastaRecibido() {
        if (!esBOB || (montoMoneda || 0) <= 0) return saldarTodo(); // fallback
        let restante = montoMoneda;
        const next: Record<number, number> = {};
        for (const c of cuentas) {
            const pend = pendientesPorCxc[c.idCuentaCobrar] || 0;
            const aplicar = Math.max(0, Math.min(pend, restante));
            next[c.idCuentaCobrar] = aplicar;
            restante -= aplicar;
            if (restante <= 0) break;
        }
        // Las cuentas restantes (si quedó) en 0
        for (const c of cuentas) {
            if (next[c.idCuentaCobrar] === undefined) next[c.idCuentaCobrar] = 0;
        }
        setMontos(next);
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrores(null);

        if (!idMoneda) return setErrores("Selecciona la moneda.");
        if (!montoMoneda || montoMoneda <= 0) return setErrores("Ingresa el monto recibido (> 0).");

        const items = cuentas
            .map((c) => ({
                idCuentaCobrar: c.idCuentaCobrar,
                montoAplicadoBob: Number(montos[c.idCuentaCobrar] || 0),
                pendiente: Number(c.montoPendienteBob) || 0,
            }))
            .filter((it) => it.montoAplicadoBob > 0);

        if (items.length === 0) return setErrores("Asigna al menos un monto a aplicar.");

        // Validaciones por fila
        const exceso = items.find((it) => it.montoAplicadoBob > it.pendiente);
        if (exceso) {
            return setErrores(`El monto a aplicar no puede superar el pendiente de la CxC #${exceso.idCuentaCobrar}.`);
        }

        // Validación cruzada contra monto recibido (solo si moneda = BOB)
        if (esBOB && totalAplicarBOB > (montoMoneda || 0)) {
            return setErrores("El total a aplicar (BOB) supera el monto recibido (BOB). Ajusta los importes.");
        }

        try {
            setSaving(true);

            const dto: PagoCrearDTO = {
                idMoneda,
                montoMoneda,
                metodoDePago,
                referenciaExterna: referenciaExterna?.trim() || undefined,
                aplicaACuenta,
                aplicaciones: items.map(({ idCuentaCobrar, montoAplicadoBob }) => ({
                    idCuentaCobrar,
                    montoAplicadoBob,
                })),
                // Si moneda es BOB, informamos equivalencia explícita
                montoBobEquivalente: esBOB ? montoMoneda : undefined,
            };

            const r = await cobrosService.crearPago(dto);

            // Si el back no aplicó automáticamente, intentar aplicar explícitamente
            if (!r.aplicado) {
                const dtoAp: PagoAplicarDTO = {
                    items: items.map((it) => ({
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
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-3">
            <div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                className="bg-white rounded-2xl shadow-xl w-[860px] max-w-[95vw] max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Aplicar pago</h3>
                        <p className="text-xs text-neutral-600">
                            {cuentas.length} cuenta(s) seleccionada(s). Pendiente total:{" "}
                            <b>{totalPendienteSel.toFixed(2)} BOB</b>
                        </p>
                    </div>
                    <button
                        onClick={() => !saving && onClose()}
                        className="text-neutral-500 hover:text-neutral-800 rounded-md px-2 py-1"
                        aria-label="Cerrar"
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="flex-1 overflow-auto px-5 py-4 space-y-5">
                    {errores && (
                        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-md px-3 py-2 text-sm">
                            {errores}
                        </div>
                    )}

                    {/* Cabecera del pago */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-sm block mb-1">Moneda</label>
                            <select
                                className="border rounded-lg px-3 py-2 w-full"
                                value={idMoneda}
                                onChange={(e) => setIdMoneda(Number(e.target.value))}
                            >
                                {monedas.map((m) => (
                                    <option key={m.idMoneda} value={m.idMoneda}>
                                        {m.codigo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm block mb-1">
                                Monto recibido {codigoMonedaActual && `(${codigoMonedaActual})`}
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                onKeyDown={blockBadKeys}
                                className="border rounded-lg px-3 py-2 w-full"
                                value={montoMoneda}
                                onChange={(e) => setMontoMoneda(Number(e.target.value) || 0)}
                            />
                            {esBOB && (
                                <div className="text-xs mt-1">
                                    {faltaSobra !== null && (
                                        <>
                                            {faltaSobra > 0 && <span className="text-emerald-700">Te quedan {faltaSobra.toFixed(2)} BOB sin distribuir.</span>}
                                            {faltaSobra < 0 && <span className="text-rose-700">Te faltan {(Math.abs(faltaSobra)).toFixed(2)} BOB por cubrir.</span>}
                                            {faltaSobra === 0 && totalAplicarBOB > 0 && <span className="text-neutral-700">Distribución exacta.</span>}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-sm block mb-1">Método de pago</label>
                            <select
                                className="border rounded-lg px-3 py-2 w-full"
                                value={metodoDePago}
                                onChange={(e) => setMetodoDePago(e.target.value as MetodoDePago)}
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm block mb-1">Referencia externa (opcional)</label>
                            <input
                                className="border rounded-lg px-3 py-2 w-full"
                                value={referenciaExterna}
                                onChange={(e) => setReferenciaExterna(e.target.value)}
                                placeholder="N° de transacción, boleta, etc."
                            />
                        </div>
                    </div>

                    {/* Acciones rápidas de distribución */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={saldarTodo}
                            className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                        >
                            Saldar todo
                        </button>
                        <button
                            type="button"
                            onClick={distribuirHastaRecibido}
                            className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                            title={esBOB ? "Distribuye en orden hasta el monto recibido" : "Con moneda distinta a BOB salda todo por defecto"}
                        >
                            Distribuir hasta recibido{!esBOB ? " (BOB requerido)" : ""}
                        </button>
                        <button
                            type="button"
                            onClick={limpiarMontos}
                            className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                        >
                            Limpiar montos
                        </button>

                        <div className="ml-auto text-sm">
                            Total a aplicar: <b>{totalAplicarBOB.toFixed(2)} BOB</b>
                        </div>
                    </div>

                    {/* Distribución por CxC */}
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-50">
                            <tr className="text-left">
                                <th className="px-3 py-2">Venta</th>
                                <th className="px-3 py-2">Cliente</th>
                                <th className="px-3 py-2 text-right">Pendiente (BOB)</th>
                                <th className="px-3 py-2 text-right">Aplicar (BOB)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {cuentas.map((c) => {
                                const pend = pendientesPorCxc[c.idCuentaCobrar] ?? 0;
                                const val = montos[c.idCuentaCobrar] ?? 0;
                                const invalido = val > pend;
                                return (
                                    <tr key={c.idCuentaCobrar} className="border-t">
                                        <td className="px-3 py-2">#{c.idVenta}</td>
                                        <td className="px-3 py-2">{c.cliente ?? c.idCliente}</td>
                                        <td className="px-3 py-2 text-right">{pend.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={pend}
                                                    step="0.01"
                                                    onKeyDown={blockBadKeys}
                                                    className={[
                                                        "border rounded-lg px-2 py-1 w-32 text-right",
                                                        invalido ? "border-rose-400 bg-rose-50" : "",
                                                    ].join(" ")}
                                                    value={val}
                                                    onChange={(e) => setMonto(c.idCuentaCobrar, e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className="text-xs px-2 py-1 rounded-md border border-neutral-300 hover:bg-neutral-50"
                                                    title="Copiar el pendiente"
                                                    onClick={() =>
                                                        setMontos((prev) => ({ ...prev, [c.idCuentaCobrar]: pend }))
                                                    }
                                                >
                                                    Pend.
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-xs px-2 py-1 rounded-md border border-neutral-300 hover:bg-neutral-50"
                                                    title="Poner en 0"
                                                    onClick={() =>
                                                        setMontos((prev) => ({ ...prev, [c.idCuentaCobrar]: 0 }))
                                                    }
                                                >
                                                    0
                                                </button>
                                            </div>
                                            {invalido && (
                                                <div className="text-rose-600 text-xs mt-1">
                                                    No puede superar el pendiente.
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {cuentas.length === 0 && (
                                <tr>
                                    <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                                        Sin cuentas seleccionadas
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Nota de conversión */}
                    {codigoMonedaActual && codigoMonedaActual !== "BOB" && (
                        <div className="text-xs text-neutral-600">
                            El monto recibido está en <b>{codigoMonedaActual}</b>. El equivalente en BOB lo
                            calculará el sistema según el tipo de cambio vigente.
                        </div>
                    )}

                    {/* Footer del formulario */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-sm">
                            <input
                                id="aplicaACuenta"
                                type="checkbox"
                                className="mr-1"
                                checked={aplicaACuenta}
                                onChange={(e) => setAplicaACuenta(e.target.checked)}
                            />
                            <label htmlFor="aplicaACuenta">Aplicar automáticamente a las cuentas (sugerido)</label>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="px-3 py-2 border rounded-lg"
                                onClick={() => !saving && onClose()}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    saving ||
                                    totalAplicarBOB <= 0 ||
                                    hayExcesoPorFila ||
                                    (esBOB && totalAplicarBOB > (montoMoneda || 0))
                                }
                                className={[
                                    "px-3 py-2 rounded-lg",
                                    "text-white",
                                    "disabled:opacity-60 disabled:cursor-not-allowed",
                                    saving ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700",
                                ].join(" ")}
                                title={
                                    hayExcesoPorFila
                                        ? "Hay montos mayores al pendiente."
                                        : esBOB && totalAplicarBOB > (montoMoneda || 0)
                                            ? "El total a aplicar supera el monto recibido."
                                            : totalAplicarBOB <= 0
                                                ? "Asigna importes mayores a 0."
                                                : "Aplicar pago"
                                }
                            >
                                {saving ? "Procesando…" : "Aplicar pago"}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Saving overlay */}
                {saving && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl">
                        <div className="animate-pulse text-emerald-700 font-medium">Procesando…</div>
                    </div>
                )}
            </div>
        </div>
    );
}
