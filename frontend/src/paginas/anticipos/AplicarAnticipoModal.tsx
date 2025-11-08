import { useEffect, useMemo, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import { cobrosService } from "@/servicios/cobros";
import type { AplicarAnticipoRespuestaDTO } from "@/types/anticipos";
import type { CxcItem, Page } from "@/types/cobros";

type Props = {
    idAnticipo: number;
    idCliente: number;                 // 🔴 nuevo
    clienteNombre?: string;            // opcional, para mostrar
    saldoAnticipoBob: number;          // 🔴 nuevo (para validar/sugerir)
    onClose: () => void;
    onDone?: (r: AplicarAnticipoRespuestaDTO) => void;
};

const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

function fmtFechaSoloDia(iso?: string | number | Date) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AplicarAnticipoModal({
                                         idAnticipo,
                                         idCliente,
                                         clienteNombre,
                                         saldoAnticipoBob,
                                         onClose,
                                         onDone,
                                     }: Props) {
    const [cxc, setCxc] = useState<CxcItem[]>([]);
    const [cxcLoading, setCxcLoading] = useState(false);
    const [cxcErr, setCxcErr] = useState<string | null>(null);

    const [idVentaSel, setIdVentaSel] = useState<number | "">("");
    const [monto, setMonto] = useState<number | "">("");

    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const ventaSel = useMemo(
        () => cxc.find(v => v?.idVenta === idVentaSel) ?? null,
        [cxc, idVentaSel]
    );

    const saldoVenta = Number(ventaSel?.montoPendienteBob ?? (ventaSel as any)?.saldoPendienteBob ?? 0);
    const maxAplicable = Math.max(0, Math.min(Number(saldoAnticipoBob || 0), Number(saldoVenta || 0)));

    async function cargarCxc() {
        try {
            setCxcLoading(true);
            setCxcErr(null);
            // 🔧 clave: filtrar por clienteId y soloAbiertas
            const res: Page<CxcItem> = await cobrosService.listarCxc({
                clienteId: idCliente,
                soloAbiertas: true,
                page: 0,
                size: 100,
            } as any);
            setCxc(res?.content ?? []);
        } catch (e: any) {
            setCxcErr(e?.response?.data?.message || e?.message || "No se pudo cargar CxC del cliente.");
            setCxc([]);
        } finally {
            setCxcLoading(false);
        }
    }

    useEffect(() => {
        cargarCxc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idCliente]);

    // Sugerir monto cuando el usuario selecciona una CxC
    useEffect(() => {
        if (ventaSel) {
            const sugerido = Math.min(Number(saldoVenta || 0), Number(saldoAnticipoBob || 0));
            setMonto(sugerido > 0 ? Number(sugerido.toFixed(2)) : "");
        } else {
            setMonto("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idVentaSel, saldoVenta, saldoAnticipoBob]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!idVentaSel) return setErr("Selecciona una cuenta por cobrar.");
        if (!monto || Number(monto) <= 0) return setErr("Ingresa un monto válido.");
        if (Number(monto) > maxAplicable) return setErr(`El monto no puede superar ${fmtMoney(maxAplicable)} BOB.`);

        try {
            setSubmitting(true);
            setErr(null);
            const r = await anticiposService.aplicar(idAnticipo, {
                idVenta: Number(idVentaSel),
                montoAplicadoBob: Number(monto),
            });
            onDone?.(r);
            onClose();
        } catch (e: any) {
            setErr(e?.response?.data?.message || e?.message || "No se pudo aplicar el anticipo");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-4 w-[520px] max-w-[95vw]">
                <div className="text-lg font-semibold mb-3">
                    Aplicar anticipo #{idAnticipo}
                </div>

                <div className="mb-3 text-sm bg-neutral-50 border rounded p-3">
                    <div>
                        <span className="text-neutral-600">Cliente:</span>{" "}
                        <span className="font-medium">{clienteNombre ?? `#${idCliente}`}</span>
                    </div>
                    <div className="mt-1">
                        <span className="text-neutral-600">Saldo anticipo:</span>{" "}
                        <span className="font-medium">{fmtMoney(saldoAnticipoBob)} BOB</span>
                    </div>
                </div>

                {(err || cxcErr) && <div className="text-red-600 text-sm mb-2">{err || cxcErr}</div>}

                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs mb-1">Cuenta por cobrar del cliente</label>
                        <div className="flex gap-2">
                            <select
                                className="border rounded px-3 py-2 w-full"
                                value={idVentaSel}
                                onChange={(e) => setIdVentaSel(e.target.value ? Number(e.target.value) : "")}
                                disabled={cxcLoading}
                            >
                                <option value="">— Selecciona una venta (CxC) —</option>
                                {cxc.map((v) => (
                                    <option key={v.idVenta} value={v.idVenta}>
                                        {`V#${v.idVenta} — Emisión ${fmtFechaSoloDia((v as any).fechaEmision ?? (v as any).fecha)} — Saldo ${fmtMoney(v.montoPendienteBob ?? (v as any).saldoPendienteBob)} BOB`}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="border rounded px-3 py-2 whitespace-nowrap disabled:opacity-50"
                                onClick={cargarCxc}
                                disabled={cxcLoading}
                                title="Actualizar lista"
                            >
                                {cxcLoading ? "Cargando…" : "Actualizar"}
                            </button>
                        </div>

                        {ventaSel && (
                            <div className="mt-2 text-xs text-neutral-600">
                                <div>Saldo de la venta: <span className="font-medium">{fmtMoney(saldoVenta)} BOB</span></div>
                                <div>Máximo aplicable (venta/anticipo): <span className="font-medium">{fmtMoney(maxAplicable)} BOB</span></div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs mb-1">Monto a aplicar (BOB)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="border rounded px-3 py-2 w-full"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder={ventaSel ? `Máximo ${fmtMoney(maxAplicable)}` : "Selecciona una CxC primero"}
                            disabled={!ventaSel}
                        />
                        {ventaSel && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <button type="button" className="border rounded px-2 py-1 hover:bg-neutral-50"
                                        onClick={() => setMonto(Number(maxAplicable.toFixed(2)))}>
                                    Aplicar máximo
                                </button>
                                <button type="button" className="border rounded px-2 py-1 hover:bg-neutral-50"
                                        onClick={() => setMonto(Number((saldoVenta || 0).toFixed(2)))}>
                                    Saldo de venta
                                </button>
                                <button type="button" className="border rounded px-2 py-1 hover:bg-neutral-50"
                                        onClick={() => setMonto(Number((saldoAnticipoBob || 0).toFixed(2)))}>
                                    Saldo de anticipo
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="border rounded px-3 py-2" disabled={submitting}>
                            Cancelar
                        </button>
                        <button type="submit" className="bg-emerald-600 text-white rounded px-3 py-2 disabled:opacity-60"
                                disabled={submitting || !ventaSel}>
                            {submitting ? "Aplicando…" : "Aplicar"}
                        </button>
                    </div>
                </form>

                {cxc.length === 0 && !cxcLoading && (
                    <div className="mt-3 text-xs text-neutral-600">
                        Este cliente no tiene cuentas por cobrar abiertas.
                    </div>
                )}
            </div>
        </div>
    );
}
