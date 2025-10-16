import type { LineaRecepcion } from "@/hooks/useRecepcionData";

export default function RecepcionItemsTable({
  lineas, presMap, setLinea,
}: {
  lineas: LineaRecepcion[];
  presMap: Record<number, string>;
  setLinea: (idx: number, patch: Partial<LineaRecepcion>) => void;
}) {

  // criterio robusto: usa cualquiera de estos campos si están presentes
  const isLocked = (l: LineaRecepcion) =>
    (l as any).cerrado === true ||
    (typeof (l as any).pendiente === "number" && (l as any).pendiente <= 0) ||
    (typeof (l as any).recibidoAcum === "number" && (l as any).recibidoAcum >= Number(l.pedido));

  return (
    <div className="rounded-lg border overflow-x-auto bg-white">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Presentación</th>
            <th className="p-2 text-right">Pedido</th>
            <th className="p-2 text-right">Recibir</th>
            <th className="p-2 text-right">Costo OC</th>
            <th className="p-2 text-right">Costo</th>
            <th className="p-2">N° Lote</th>
            <th className="p-2">F. Fab</th>
            <th className="p-2">F. Vence *</th>
            <th className="p-2">Obs</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, idx) => {
            const locked = isLocked(l);
            const rowCls = locked ? "bg-gray-100 text-gray-500 opacity-70" : "";
            const inputLockCls = locked ? "bg-gray-50 pointer-events-none" : "";

            return (
              <tr key={l.idCompraDetalle} className={`border-t ${rowCls}`} aria-disabled={locked}>
                <td className="p-2">
                  {presMap[l.idPresentacion] ?? `#${l.idPresentacion}`}
                  {locked && (
                    <span className="ml-2 text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">
                      Completado
                    </span>
                  )}
                </td>

                <td className="p-2 text-right">{Number(l.pedido).toFixed(3)}</td>

                <td className="p-2 text-right">
                  <input
                    type="number" step="0.001" min="0"
                    className={`w-28 border rounded px-2 py-1 text-right ${inputLockCls}`}
                    value={l.cant}
                    onChange={(e) => setLinea(idx, { cant: Number(e.target.value) })}
                    readOnly={locked}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                    title={locked ? "Este ítem ya fue recibido completamente" : ""}
                  />
                </td>

                <td className="p-2 text-right text-neutral-500">{Number(l.costoOc).toFixed(6)}</td>

                <td className="p-2 text-right">
                  <input
                    type="number" step="0.000001" min="0"
                    className={`w-28 border rounded px-2 py-1 text-right ${inputLockCls}`}
                    value={l.costo}
                    onChange={(e) => setLinea(idx, { costo: Number(e.target.value) })}
                    readOnly={locked}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </td>

                <td className="p-2">
                  <input
                    className={`w-36 border rounded px-2 py-1 ${inputLockCls}`}
                    placeholder="Lote"
                    value={l.lote}
                    onChange={(e) => setLinea(idx, { lote: e.target.value })}
                    readOnly={locked}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </td>

                <td className="p-2">
                  <input
                    type="date"
                    className={`border rounded px-2 py-1 ${inputLockCls}`}
                    value={l.fab || ""}
                    onChange={(e) => setLinea(idx, { fab: e.target.value })}
                    readOnly={locked}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </td>

                <td className="p-2">
                  <input
                    type="date"
                    className={`border rounded px-2 py-1 ${inputLockCls}`}
                    value={l.vence || ""}
                    onChange={(e) => setLinea(idx, { vence: e.target.value })}
                    readOnly={locked}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </td>

                <td className="p-2">
                  <input
                    className={`w-44 border rounded px-2 py-1 ${inputLockCls}`}
                    value={l.obs || ""}
                    onChange={(e) => setLinea(idx, { obs: e.target.value })}
                    readOnly={locked}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </td>

                <td className="p-2 text-right">
                  <button
                    type="button"
                    className={`text-xs px-2 py-1 border rounded ${locked ? "opacity-50 pointer-events-none" : "hover:bg-neutral-50"}`}
                    onClick={() => setLinea(idx, { cant: 0, lote: "", fab: "", vence: "", obs: "" })}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                    title={locked ? "Ítem completado" : "Limpiar"}
                  >
                    Limpiar
                  </button>
                </td>
              </tr>
            );
          })}
          {lineas.length === 0 && (
            <tr><td colSpan={10} className="p-4 text-center text-neutral-500">Sin ítems.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
