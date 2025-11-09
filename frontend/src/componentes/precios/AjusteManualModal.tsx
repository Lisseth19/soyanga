import { useState } from "react";
import { preciosService } from "@/servicios/precios";

type Props = {
  open: boolean;
  onClose: () => void;
  idPresentacion: number | null;
  sku?: string;
  onSaved?: () => void;
};

export default function AjusteManualModal({ open, onClose, idPresentacion, sku, onSaved }: Props) {
  const [precio, setPrecio] = useState<number | "">("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const puedeGuardar = !!idPresentacion && precio !== "" && motivo.trim().length > 1;

  if (!open) return null;

  const guardar = async () => {
    if (!idPresentacion || precio === "" || !motivo) return;
    setGuardando(true);
    try {
      await preciosService.cambioManual(idPresentacion, Number(precio), motivo, null, "ui");
      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 text-slate-100 p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Realizar Ajuste de Precio Manual {sku ? `· ${sku}` : ""}</h3>

        <label className="text-sm opacity-80">Nuevo Precio (Bs)</label>
        <input
          type="number"
          step="0.01"
          value={precio}
          onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full mt-1 mb-4 rounded-lg bg-slate-800 px-3 py-2 outline-none border border-slate-700 focus:border-emerald-400"
          placeholder="Ej: 209.99"
        />

        <label className="text-sm opacity-80">Motivo del ajuste (obligatorio)</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="w-full mt-1 rounded-lg bg-slate-800 px-3 py-2 outline-none border border-slate-700 focus:border-emerald-400"
          placeholder="Corrección de precio, ajuste de mercado…"
        />

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">Cancelar</button>
          <button
            onClick={guardar}
            disabled={!puedeGuardar || guardando}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
          >
            {guardando ? "Guardando..." : "Confirmar Ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}
