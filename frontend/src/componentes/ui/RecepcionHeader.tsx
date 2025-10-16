import { Calendar } from "lucide-react";
import { useRef } from "react";
import type { Opcion } from "@/hooks/useAlmacenes";

export default function RecepcionHeader({
  almacenes, idAlmacen, setIdAlmacen,
  fecha, setFecha, numeroDoc, setNumeroDoc, obs, setObs,
}: {
  almacenes: Opcion[];
  idAlmacen: number; setIdAlmacen: (v: number) => void;
  fecha: string; setFecha: (v: string) => void;
  numeroDoc: string; setNumeroDoc: (v: string) => void;
  obs: string; setObs: (v: string) => void;
}) {
  const refFecha = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">Almacén</label>
          <div className="relative">
            <select
              className="w-full border rounded-lg px-3 py-2 appearance-none"
              // 👇 mostramos "" si no hay selección válida (>0)
              value={idAlmacen > 0 ? String(idAlmacen) : ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 0 : Number(e.target.value);
                setIdAlmacen(v);
              }}
            >
              {/* 👇 placeholder */}
              <option value="" disabled>Seleccione un almacén…</option>

              {almacenes.map(a => (
                <option key={a.value} value={String(a.value)}>
                  {a.label}
                </option>
              ))}
            </select>

            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▾</span>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Fecha recepción</label>
          <div className="relative">
            <input
              ref={refFecha}
              type="date"
              className="w-full border rounded-lg px-3 py-2 pr-9"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                (refFecha.current as any)?.showPicker
                  ? (refFecha.current as any).showPicker()
                  : refFecha.current?.focus()
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
              title="Abrir calendario"
            >
              <Calendar className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">N° doc. proveedor</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Factura / Remisión…"
            value={numeroDoc}
            onChange={(e) => setNumeroDoc(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Observaciones</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Notas generales…"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
