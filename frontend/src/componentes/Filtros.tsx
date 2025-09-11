import type { OpcionIdNombre } from "@/servicios/catalogo";
import { exportCsv } from "@/utils/csv";

type Props = {
  almacenId?: number; setAlmacenId: (v?: number)=>void;
  productoInput: string; setProductoInput: (v:string)=>void;
  venceAntes: string; setVenceAntes: (v:string)=>void;
  loadingAlmacenes: boolean; almacenes: OpcionIdNombre[];
  dataForExport: Array<Record<string, any>>;
  onApply: () => void; onReset: () => void;
  size: number; setSize: (n:number)=>void; setPage: (n:number)=>void;
};

export function Filtros(p: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Almacén</label>
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

      <div className="md:col-span-2 flex flex-col">
        <label className="text-sm text-gray-600">Producto o SKU</label>
        <input className="border rounded-lg px-3 py-2"
          value={p.productoInput}
          onChange={(e)=>{ p.setProductoInput(e.target.value); p.setPage(0); }}
          placeholder="Buscar por nombre o SKU…" />
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Vence antes de</label>
        <input type="date" className="border rounded-lg px-3 py-2"
          value={p.venceAntes}
          onChange={(e)=>{ p.setVenceAntes(e.target.value); p.setPage(0); }} />
      </div>

      <div className="flex gap-2">
        <button onClick={p.onReset}  className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100">Limpiar</button>
        <button onClick={p.onApply} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Aplicar</button>
        <button
          onClick={()=> exportCsv("inventario_por_lote.csv", p.dataForExport)}
          className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100"
          disabled={!p.dataForExport.length}
          title="Exporta el resultado actual (con filtros)"
        >Exportar CSV</button>
      </div>
    </div>
  );
}
