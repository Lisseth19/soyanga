import type { CatalogVariant } from "@/types/producto";

function StockBadge({ value }: { value: number }) {
    const clazz =
        value <= 0
            ? "border-red-500/40 text-red-300 bg-red-500/10"
            : value < 10
                ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                : "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";

    return (
        <span className={`px-2 py-1 rounded-full text-xs border ${clazz}`}>
      {value <= 0 ? "Sin stock" : `Stock: ${value}`}
    </span>
    );
}

export default function VariantList({ variantes }: { variantes: CatalogVariant[] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--light-bg)]">
            <table className="min-w-full text-sm">
                <thead className="text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]/70">
                    <th className="p-3 text-left font-medium">Presentación</th>
                    <th className="p-3 text-left font-medium">Contenido</th>
                    <th className="p-3 text-left font-medium">Formulación</th>
                    <th className="p-3 text-left font-medium">Stock</th>
                    <th className="p-3 text-right font-medium">Acción</th>
                </tr>
                </thead>
                <tbody className="text-[var(--fg)]">
                {variantes?.map((v) => (
                    <tr key={v.id} className="border-b border-[var(--border)]/60">
                        <td className="p-3">{v.nombreCorto ?? v.sku}</td>
                        <td className="p-3">
                            {v.contenidoNeto} {v.unidad}
                        </td>
                        <td className="p-3">{v.formulacion ?? "—"}</td>
                        <td className="p-3">
                            <StockBadge value={v.stockDisponible ?? 0} />
                        </td>
                        <td className="p-3 text-right">
                            <button
                                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs
                             border-[var(--primary-color)] text-[var(--primary-color)]
                             hover:bg-[var(--primary-color)] hover:text-white transition disabled:opacity-50"
                                disabled={(v.stockDisponible ?? 0) <= 0}
                                onClick={() => alert(`Agregar ${v.sku} a cotización (pendiente store)`)}
                            >
                                Agregar a cotización
                            </button>
                        </td>
                    </tr>
                ))}

                {!variantes?.length && (
                    <tr>
                        <td className="p-4 text-center text-[var(--muted)]" colSpan={5}>
                            Sin presentaciones registradas.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}
