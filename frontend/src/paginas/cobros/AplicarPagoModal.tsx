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

    // Cerrar al click afuera
    useEffect(() => {
        function onDoc(ev: MouseEvent) {
            if (cardRef.current && !cardRef.current.contains(ev.target as Node)) onClose();
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [onClose]);

    // Monedas (con fallback si el endpoint falla)
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    useEffect(() => {
        (async () => {
            try {
                const arr = await http.get<any[]>("/v1/monedas");
                setMonedas(
                    (arr ?? []).map(m => ({
                        idMoneda: m.idMoneda ?? m.id,
                        codigo: String(m.codigo ?? m.simbolo ?? m.nombre ?? m.idMoneda).toUpperCase(),
                        nombre: m.nombre,
                        simbolo: m.simbolo,
                    }))
                );
            } catch {
                setMonedas([{ idMoneda: 1, codigo: "BOB" }, { idMoneda: 2, codigo: "USD" }]);
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
    const [saving, setSaving] = useState(false);

    // Editor de montos por CxC
    const [montos, setMontos] = useState<Record<number, number>>(() => {
        const obj: Record<number, number> = {};
        for (const c of cuentas) obj[c.idCuentaCobrar] = c.montoPendienteBob ?? 0;
        return obj;
    });

    const totalAplicar = useMemo(
        () => Object.values(montos).reduce((a, b) => a + (Number(b) || 0), 0),
        [montos]
    );

    function setMonto(idCxc: number, vRaw: string) {
        const v = Number(vRaw);
        setMontos(prev => ({ ...prev, [idCxc]: v < 0 || Number.isNaN(v) ? 0 : v }));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrores(null);

        if (!idMoneda) return setErrores("Selecciona la moneda.");
        if (!montoMoneda || montoMoneda <= 0) return setErrores("Ingresa el monto recibido (> 0).");

        const items = cuentas
            .map(c => ({
                idCuentaCobrar: c.idCuentaCobrar,
                montoAplicadoBob: Number(montos[c.idCuentaCobrar] || 0),
            }))
            .filter(it => it.montoAplicadoBob > 0);

        if (items.length === 0) return setErrores("Asigna al menos un monto a una CxC.");

        try {
            setSaving(true);

            const dto: PagoCrearDTO = {
                idMoneda,
                montoMoneda,
                metodoDePago,
                referenciaExterna: referenciaExterna?.trim() || undefined,
                aplicaACuenta,
                aplicaciones: items,
            };

            const r = await cobrosService.crearPago(dto);

            // Si el back no aplicó automáticamente, intentar aplicar explícitamente
            if (!r.aplicado) {
                const dtoAp: PagoAplicarDTO = {
                    items: items.map(it => ({
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

    function blockBadKeys(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (["e", "E", "+", "-"].includes(ev.key)) ev.preventDefault();
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
            <div ref={cardRef} className="bg-white rounded-xl p-4 w-[720px] max-w-[95vw]">
                <h3 className="text-lg font-semibold">Aplicar pago</h3>
                {errores && <div className="text-red-600 text-sm mt-2">{errores}</div>}

                <form onSubmit={submit} className="mt-3 space-y-4">
                    {/* Cabecera del pago */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-sm block mb-1">Moneda</label>
                            <select
                                className="border rounded px-3 py-2 w-full"
                                value={idMoneda}
                                onChange={(e) => setIdMoneda(Number(e.target.value))}
                            >
                                {monedas.map(m => (
                                    <option key={m.idMoneda} value={m.idMoneda}>
                                        {m.codigo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm block mb-1">Monto recibido</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                onKeyDown={blockBadKeys}
                                className="border rounded px-3 py-2 w-full"
                                value={montoMoneda}
                                onChange={(e) => setMontoMoneda(Number(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="text-sm block mb-1">Método de pago</label>
                            <select
                                className="border rounded px-3 py-2 w-full"
                                value={metodoDePago}
                                onChange={(e) => setMetodoDePago(e.target.value as MetodoDePago)}
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm block mb-1">Referencia externa (opcional)</label>
                        <input
                            className="border rounded px-3 py-2 w-full"
                            value={referenciaExterna}
                            onChange={(e) => setReferenciaExterna(e.target.value)}
                        />
                    </div>

                    {/* Distribución por CxC */}
                    <div className="border rounded overflow-x-auto">
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
                            {cuentas.map((c) => (
                                <tr key={c.idCuentaCobrar} className="border-t">
                                    <td className="px-3 py-2">#{c.idVenta}</td>
                                    <td className="px-3 py-2">{c.cliente ?? c.idCliente}</td>
                                    <td className="px-3 py-2 text-right">
                                        {(Number(c.montoPendienteBob) || 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            onKeyDown={blockBadKeys}
                                            className="border rounded px-2 py-1 w-32 text-right"
                                            value={montos[c.idCuentaCobrar] ?? 0}
                                            onChange={(e) => setMonto(c.idCuentaCobrar, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {cuentas.length === 0 && (
                                <tr><td className="px-3 py-4 text-neutral-500" colSpan={4}>Sin cuentas seleccionadas</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <input
                                id="aplicaACuenta"
                                type="checkbox"
                                className="mr-1"
                                checked={aplicaACuenta}
                                onChange={(e) => setAplicaACuenta(e.target.checked)}
                            />
                            <label htmlFor="aplicaACuenta">Aplicar automáticamente a las cuentas (sugerido)</label>
                        </div>
                        <div> Total a aplicar: <b>{totalAplicar.toFixed(2)} BOB</b> </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button type="button" className="px-3 py-2 border rounded" onClick={onClose}>
                            Cancelar
                        </button>
                        <button className="px-3 py-2 border rounded" disabled={saving}>
                            {saving ? "Procesando…" : "Aplicar pago"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
