import { useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import type { AplicarAnticipoRespuestaDTO } from "@/types/anticipos";

type Props = {
    idAnticipo: number;
    onClose: () => void;
    onDone?: (r: AplicarAnticipoRespuestaDTO) => void;
};

export function AplicarAnticipoModal({ idAnticipo, onClose, onDone }: Props) {
    const [idVenta, setIdVenta] = useState<number | "">("");
    const [monto, setMonto] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!idVenta || !monto) {
            setErr("Completa venta y monto.");
            return;
        }
        try {
            setLoading(true);
            setErr(null);
            const r = await anticiposService.aplicar(idAnticipo, {
                idVenta: Number(idVenta),
                montoAplicadoBob: Number(monto),
            });
            onDone?.(r);
            onClose();
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                "No se pudo aplicar el anticipo";
            setErr(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-4 w-[420px]">
                <div className="text-lg font-semibold mb-3">
                    Aplicar anticipo #{idAnticipo}
                </div>

                {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs mb-1">ID Venta</label>
                        <input
                            type="number"
                            className="border rounded px-3 py-2 w-full"
                            value={idVenta}
                            onChange={(e) => setIdVenta(e.target.value ? Number(e.target.value) : "")}
                            placeholder="Ej. 5003"
                        />
                    </div>

                    <div>
                        <label className="block text-xs mb-1">Monto a aplicar (BOB)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="border rounded px-3 py-2 w-full"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : "")}
                            placeholder="Ej. 150.00"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="border rounded px-3 py-2"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-emerald-600 text-white rounded px-3 py-2 disabled:opacity-60"
                            disabled={loading}
                        >
                            {loading ? "Aplicando…" : "Aplicar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
