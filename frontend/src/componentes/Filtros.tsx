import { useRef } from "react";
import type { OpcionIdNombre } from "@/servicios/almacen";
import { exportCsv } from "@/utils/csv";

type Props = {
    almacenId?: number; setAlmacenId: (v?: number)=>void;
    productoInput: string; setProductoInput: (v:string)=>void;
    venceAntes: string; setVenceAntes: (v:string)=>void;
    loadingAlmacenes: boolean; almacenes: OpcionIdNombre[];
    dataForExport: Array<Record<string, any>>;
    onReset: () => void;
    size: number; setSize: (n:number)=>void; setPage: (n:number)=>void;
};

export function Filtros(p: Props) {
    const dateRef = useRef<HTMLInputElement>(null);

    const openPicker = () => {
        const el = dateRef.current;
        if (!el) return;
        // @ts-ignore
        if (typeof el.showPicker === "function") el.showPicker();
        else el.focus();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            {/* Almacén */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-600">Almacén</label>
                <select
                    value={p.almacenId ?? ""}
                    onChange={(e)=>{ const v=e.target.value; p.setAlmacenId(v===""?undefined:Number(v)); p.setPage(0); }}
                    className="border rounded-lg px-3 py-2"
                    disabled={p.loadingAlmacenes}
                >
                    <option value="">{p.loadingAlmacenes ? "Cargando..." : "Todos"}</option>
                    {p.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
            </div>

            {/* Producto / SKU (live search con debounce desde la página) */}
            <div className="md:col-span-2 flex flex-col">
                <label className="text-xs text-gray-600">Producto o SKU</label>
                <input
                    className="border rounded-lg px-3 py-2"
                    value={p.productoInput}
                    onChange={(e)=>{ p.setProductoInput(e.target.value); }}
                    placeholder="Buscar por nombre o SKU…"
                />
            </div>

            {/* Vence antes (input group) */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-600">Vence antes de</label>

                <div
                    className="flex items-stretch rounded-lg border overflow-hidden
               focus-within:ring-2 focus-within:ring-emerald-500/30"
                >
                    <input
                        ref={dateRef}
                        type="date"
                        className="input-date-no-indicator flex-1 min-w-[12ch] px-3 py-2
                 border-0 outline-none whitespace-nowrap"
                        value={p.venceAntes}
                        onChange={(e)=>{ p.setVenceAntes(e.target.value); p.setPage(0); }}
                        aria-label="Vence antes de"
                    />

                    {/* Botón calendario */}
                    <button
                        type="button"
                        onClick={openPicker}
                        title="Abrir calendario"
                        className="flex-none shrink-0 w-9 h-9 border-l grid place-items-center hover:bg-gray-50"
                        aria-label="Abrir calendario"
                    >
                        🗓
                    </button>

                    {/* Botón limpiar */}
                    {p.venceAntes && (
                        <button
                            type="button"
                            onClick={()=>{ p.setVenceAntes(""); p.setPage(0); }}
                            title="Limpiar fecha"
                            className="flex-none shrink-0 w-9 h-9 border-l grid place-items-center hover:bg-gray-50"
                            aria-label="Limpiar fecha"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Acciones */}
            <div className="md:col-span-2 flex flex-wrap gap-2 justify-start md:justify-end">
                <button
                    onClick={()=>{ p.onReset(); }}
                    className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100"
                >
                    Limpiar
                </button>
                <button
                    onClick={()=> exportCsv("inventario_por_lote.csv", p.dataForExport)}
                    className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 shrink-0 whitespace-nowrap"
                    disabled={!p.dataForExport.length}
                    title="Exporta el resultado actual (con filtros)"
                >
                    Exportar CSV
                </button>
            </div>
        </div>
    );
}
