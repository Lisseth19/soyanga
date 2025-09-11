import type { InventarioPorLoteItem } from "@/servicios/inventario";
import { diasHasta } from "@/utils/fechas";
import { cls, type SortDir } from "@/utils/sort";
import { SortIcon } from "@/utils/SortIcon";
// import type { SortDir } from "../hooks/useInventarioPorLote";

export function Th({ children, sortable, field, current, onSort }:{
  children: React.ReactNode; sortable?: boolean; field?: string;
  current?: { field: string; dir: SortDir }; onSort?: (f:string)=>void;
}) {
  if (!sortable || !field || !current || !onSort) {
    return <th className="text-left px-3 py-2 font-medium">{children}</th>;
  }
  const active = current.field === field;
  return (
    <th className={cls("text-left px-3 py-2 font-medium select-none cursor-pointer", active?"text-black":"text-gray-700")}
        onClick={()=>onSort(field)} title="Ordenar">
      <span className="inline-flex items-center gap-1">
        {children}<SortIcon active={active} dir={active ? current.dir : undefined}/>
      </span>
    </th>
  );
}

export function Tabla({
  rows, sortState, onHeaderSort, verMovimientos
}:{
  rows: InventarioPorLoteItem[]; sortState: {field:string; dir:SortDir};
  onHeaderSort:(f:string)=>void; verMovimientos:(r:InventarioPorLoteItem)=>void;
}) {
  return (
    <div className="overflow-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th sortable field="sku" current={sortState} onSort={onHeaderSort}>SKU</Th>
            <Th sortable field="producto" current={sortState} onSort={onHeaderSort}>Producto</Th>
            <Th>Lote</Th>
            <Th sortable field="vencimiento" current={sortState} onSort={onHeaderSort}>Vence</Th>
            <Th sortable field="disponible" current={sortState} onSort={onHeaderSort}>Disp.</Th>
            <Th>Reserv.</Th>
            <Th sortable field="almacen" current={sortState} onSort={onHeaderSort}>Almacén</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} className="text-center py-8 text-gray-500">Sin resultados</td></tr>
          )}
          {rows.map(row => {
            const d = diasHasta(row.vencimiento);
            const badge =
              d===null ? "bg-gray-100 text-gray-700" :
              d<0 ? "bg-red-100 text-red-800" :
              d<=30 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
            const bajo = row.stockMinimo!=null && Number(row.disponible)<Number(row.stockMinimo);
            return (
              <tr key={`${row.loteId}-${row.presentacionId}`} className="border-t">
                <td className="px-3 py-2 tabular-nums">{row.sku}</td>
                <td className="px-3 py-2">{row.producto}</td>
                <td className="px-3 py-2">{row.numeroLote}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${badge}`} title={
                    d===null ? "Fecha no disponible" : d<0 ? `${Math.abs(d)} día(s) vencido` : `${d} día(s) restantes`
                  }>{row.vencimiento}</span>
                </td>
                <td className={`px-3 py-2 text-right ${bajo ? "text-red-600 font-semibold" : ""}`}>
                  {row.disponible}
                  {bajo && <span className="ml-1 text-xs align-middle" title={`Stock mínimo: ${row.stockMinimo}`}>⚠️</span>}
                </td>
                <td className="px-3 py-2 text-right">{row.reservado}</td>
                <td className="px-3 py-2">{row.almacen}</td>
                <td className="px-3 py-2">
                  <button onClick={()=>verMovimientos(row)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Mov.</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
