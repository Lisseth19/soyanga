// src/paginas/publico/CatalogoPublico.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarProductosPublico } from "@/servicios/catalogo";
import type { ProductoPublicoResumenDTO } from "@/types/catalogo-publico";
import CategorySidebar from "@/componentes/catalogo/CategorySidebar";

export default function CatalogoPublico() {
    const [items, setItems] = useState<ProductoPublicoResumenDTO[]>([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activaId, setActivaId] = useState<number | "all">("all");

    // Mapa de categorías (id, nombre, contador)
    const categorias = useMemo(() => {
        const map = new Map<number, { id: number; nombre: string; count: number }>();
        for (const p of items) {
            if (typeof p.idCategoria !== "number") continue;
            const nombre = p.categoriaNombre?.trim() || `Categoría ${p.idCategoria}`;
            map.set(p.idCategoria, {
                id: p.idCategoria,
                nombre,
                count: (map.get(p.idCategoria)?.count ?? 0) + 1,
            });
        }
        return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [items]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        listarProductosPublico({ q, page: 0, size: 24 })
            .then((page) => alive && setItems(page.content ?? (page as any)))
            .catch((e: any) => alive && setError(e?.message || "No se pudo cargar el catálogo"))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [q]);

    const filtrados = useMemo(() => {
        if (activaId === "all") return items;
        return items.filter((p) => p.idCategoria === activaId);
    }, [items, activaId]);

    const titulo = useMemo(() => {
        if (activaId === "all") return "Todos los productos";
        const c = categorias.find((x) => x.id === activaId);
        return c?.nombre ?? `Categoría ${activaId}`;
    }, [activaId, categorias]);

    return (
        <section className="mx-auto max-w-7xl px-4 py-6">
            {/* Encabezado + búsqueda */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-fg text-2xl font-semibold">
                        {titulo}{" "}
                        <span className="text-muted text-sm font-normal">({filtrados.length})</span>
                    </h2>
                    <p className="text-muted text-sm">
                        Explora los productos y sus presentaciones públicas.
                    </p>
                </div>

                {/* Buscar */}
                <div className="relative w-full sm:w-[420px]">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar por nombre o principio activo…"
                        className="w-full rounded-full border border-[var(--border)]
                       bg-[var(--light-bg)] text-fg placeholder:text-muted
                       px-4 py-2 pl-10 outline-none ring-emerald-700/30
                       focus:border-emerald-600 focus:ring-2 transition"
                    />
                    <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-3.5-3.5" />
                    </svg>
                </div>
            </div>

            {/* MÓVIL: chips horizontales de categorías (incluye "Todas") */}
            <div className="sticky -mx-4 mb-2 block border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 py-2 backdrop-blur lg:hidden">
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActivaId("all")}
                        className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition
              ${
                            activaId === "all"
                                ? "border-emerald-600 bg-emerald-700/15 text-fg"
                                : "border-[var(--border)] bg-[var(--light-bg)] text-fg hover:bg-black/5"
                        }`}
                    >
                        Todas
                    </button>
                    {categorias.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setActivaId(c.id)}
                            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition
                ${
                                activaId === c.id
                                    ? "border-emerald-600 bg-emerald-700/15 text-fg"
                                    : "border-[var(--border)] bg-[var(--light-bg)] text-fg hover:bg-black/5"
                            }`}
                            title={c.nombre}
                        >
                            {c.nombre}
                            <span className="text-muted opacity-80"> ({c.count})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* DESKTOP: sidebar + grid */}
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[256px_1fr]">
                <CategorySidebar categorias={categorias} activaId={activaId} onSelect={setActivaId} />

                {/* GRID DE TARJETAS (compactas) */}
                <div>
                    {loading && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--light-bg)] p-2"
                                >
                                    <div className="aspect-[3/4] w-full rounded-lg bg-black/10" />
                                    <div className="mt-2 h-4 rounded bg-black/10" />
                                    <div className="mt-1 h-3 w-2/3 rounded bg-black/10" />
                                </div>
                            ))}
                        </div>
                    )}

                    {error && !loading && (
                        <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    {!loading && !error && filtrados.length === 0 && (
                        <div className="text-muted">No hay productos para mostrar.</div>
                    )}

                    {!loading && !error && filtrados.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                            {filtrados.map((p) => (
                                <article
                                    key={p.idProducto}
                                    className="group rounded-xl border border-[var(--border)] bg-[var(--light-bg)] p-2 transition-colors hover:border-emerald-700/60 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
                                >
                                    <Link to={`/soyanga/producto/${p.idProducto}`} className="block no-underline">
                                        {/* Imagen compacta vertical */}
                                        <div className="no-copy-img aspect-[3/4] w-full overflow-hidden rounded-lg bg-black/10">
                                            {p.imagenUrl ? (
                                                <img
                                                    src={`${p.imagenUrl}?v=${p.idProducto}`} // cache-busting suave
                                                    alt={p.nombreProducto}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-xs text-muted">
                                                    Sin imagen
                                                </div>
                                            )}
                                        </div>

                                        {/* Nombre (2 líneas) */}
                                        <h3 className="text-fg mt-2 line-clamp-2 text-[13px] font-semibold leading-tight sm:text-[14px]">
                                            {p.nombreProducto}
                                        </h3>

                                        {/* Faja inferior: categoría + #presentaciones */}
                                        <div className="mt-2 flex items-center justify-between">
                      <span
                          className="truncate rounded-full border border-[var(--border)] bg-[var(--light-bg)] px-2 py-1 text-[10px] text-muted sm:text-[11px]"
                          title={p.categoriaNombre || `Categoría ${p.idCategoria}`}
                      >
                        {p.categoriaNombre || `Categoría ${p.idCategoria}`}
                      </span>
                                            <span className="text-[10px] text-muted sm:text-[11px]">
                        {p.cantidadPresentaciones} presentación{p.cantidadPresentaciones === 1 ? "" : "es"}
                      </span>
                                        </div>
                                    </Link>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
