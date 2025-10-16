// src/componentes/catalogo/ProductCard.tsx
import { Link } from "react-router-dom";
import type { CatalogProduct } from "@/types/producto";

// Si prefieres, puedes importar el tipo real:
// import type { ProductoPublicoResumenDTO } from "@/types/catalogo-publico";

type PublicoProducto = {
    idProducto: number;
    nombreProducto: string;
    imagenUrl?: string | null;
    categoriaNombre?: string | null;
    cantidadPresentaciones: number;
};

type ProductoCard = CatalogProduct | PublicoProducto;

function getNombre(p: ProductoCard) {
    return (p as PublicoProducto).nombreProducto ?? (p as CatalogProduct).nombre;
}
function getImagen(p: ProductoCard) {
    return (p as any).imagenUrl ?? null;
}
function getCategoria(p: ProductoCard) {
    return (p as PublicoProducto).categoriaNombre ?? (p as any).categoria ?? null;
}
function getPresentaciones(p: ProductoCard) {
    const pub = p as PublicoProducto;
    if (typeof pub.cantidadPresentaciones === "number") return pub.cantidadPresentaciones;
    const adm = p as CatalogProduct;
    return adm.variantes?.length ?? 0;
}
/** 🔒 Navegamos SIEMPRE por ID para que coincida con /soyanga/producto/:id */
function getHref(p: ProductoCard) {
    const id = (p as any).idProducto ?? (p as any).id;
    return `/soyanga/producto/${id}`;
}

export default function ProductCard({ producto }: { producto: ProductoCard }) {
    const nombre = getNombre(producto);
    const imagen = getImagen(producto);
    const categoria = getCategoria(producto);
    const count = getPresentaciones(producto);
    const href = getHref(producto);
    const cacheBust =
        (producto as any).idProducto ??
        (producto as any).id ??
        (typeof nombre === "string" ? nombre.length : 1);

    return (
        <article
            className="group flex flex-col overflow-hidden rounded-xl bg-[var(--light-bg)] border border-[var(--border)]
                 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,.25)]"
        >
            <Link to={href} className="relative block no-underline">
                <div className="no-copy-img w-full aspect-[3/4] overflow-hidden bg-black/10 rounded-b-none">
                    {imagen ? (
                        <img
                            src={`${imagen}?v=${cacheBust}`} // cache-busting suave
                            alt={typeof nombre === "string" ? nombre : "Producto"}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="w-full h-full grid place-items-center text-[var(--muted)] text-xs">
                            Sin imagen
                        </div>
                    )}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
            </Link>

            <div className="p-3 flex-1 flex flex-col">
                <Link to={href} className="block no-underline">
                    <h3 className="text-[13px] sm:text-[14px] font-semibold leading-tight text-[var(--fg)] line-clamp-2">
                        {nombre}
                    </h3>
                </Link>

                <div className="mt-2 flex items-center justify-between">
                    {/* Chip de categoría con mejor contraste en tema claro/oscuro */}
                    <span
                        className="text-[10px] sm:text-[11px] px-2 py-1 rounded-full border border-[var(--border)]
                       text-[var(--fg)]/70 bg-[color:var(--fg)]/[0.06] truncate"
                        title={categoria ?? "Categoría"}
                    >
            {categoria ?? "Categoría"}
          </span>

                    <span className="text-[10px] sm:text-[11px] text-[var(--muted)]">
            {count} presentación{count === 1 ? "" : "es"}
          </span>
                </div>
            </div>
        </article>
    );
}
