import { useInventarioPorLote } from "@/hooks/useInventarioPorLote";
import { Filtros } from "@/componentes/Filtros";
import { Tabla } from "@/componentes/Tabla";
import { Paginacion } from "@/componentes/Paginacion";
import { MovimientosModal } from "@/componentes/MovimientosModal";

export default function InventarioPorLotePage() {
  const s = useInventarioPorLote();

  const exportRows = (s.data?.content ?? []).map(r => ({
    SKU: r.sku, Producto: r.producto, Lote: r.numeroLote, Vence: r.vencimiento,
    Disponible: r.disponible, Reservado: r.reservado, Almacen: r.almacen,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Inventario por lote</h1>

      <Filtros
        almacenId={s.almacenId} setAlmacenId={s.setAlmacenId}
        productoInput={s.productoInput} setProductoInput={s.setProductoInput}
        venceAntes={s.venceAntes} setVenceAntes={s.setVenceAntes}
        loadingAlmacenes={s.loadingAlmacenes} almacenes={s.almacenes}
        dataForExport={exportRows}
        onApply={()=>s.setPage(0)}
        onReset={s.resetFilters}
        size={s.size} setSize={s.setSize} setPage={s.setPage}
      />

      {s.loading && <div className="text-sm text-gray-600">Cargando inventario…</div>}
      {s.err && <div className="text-sm text-red-600">Error: {s.err}</div>}

      <Tabla
        rows={s.data?.content ?? []}
        sortState={s.sortState}
        onHeaderSort={s.onHeaderSort}
        verMovimientos={s.verMovimientos}
      />

      <Paginacion
        page={s.page}
        totalPages={s.data?.totalPages ?? 1}
        totalElements={s.data?.totalElements ?? 0}
        size={s.size}
        setPage={s.setPage}
        setSize={s.setSize}
        loading={s.loading}
        isFirst={s.data?.first ?? true}
        isLast={s.data?.last ?? true}
      />

      <MovimientosModal
        open={s.movOpen} onClose={()=>s.setMovOpen(false)}
        titulo={s.movTitulo}
        loading={s.movLoading}
        error={s.movError}
        items={s.movs}
      />
    </div>
  );
}
