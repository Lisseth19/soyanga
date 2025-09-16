export function Paginacion({
                               page, totalPages, totalElements, size, setPage, setSize, loading, isFirst, isLast
                           }:{
    page: number; totalPages: number; totalElements: number; size: number;
    setPage:(n:number)=>void; setSize:(n:number)=>void; loading:boolean; isFirst:boolean; isLast:boolean;
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600">
                {Number.isFinite(totalPages)
                    ? <>Mostrando página <strong>{page+1}</strong> de <strong>{totalPages || 1}</strong> — <strong>{totalElements || 0}</strong> elementos</>
                    : "—"}
            </div>
            <div className="flex items-center gap-2">
                <button
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 disabled:opacity-50"
                    aria-disabled={loading || isFirst}
                    onClick={()=>setPage(Math.max(0, page-1))}
                    disabled={loading || isFirst}
                >
                    ← Anterior
                </button>
                <button
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 disabled:opacity-50"
                    aria-disabled={loading || isLast}
                    onClick={()=>setPage(Math.min((totalPages||1)-1, page+1))}
                    disabled={loading || isLast}
                >
                    Siguiente →
                </button>
                <select
                    className="ml-2 border border-neutral-300 rounded-lg px-2 py-1.5"
                    value={size}
                    onChange={(e)=>{ setSize(Number(e.target.value)); setPage(0); }}
                >
                    {[10,20,50,100].map(n => <option key={n} value={n}>{n} por página</option>)}
                </select>
            </div>
        </div>
    );
}
