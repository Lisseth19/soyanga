// src/paginas/publico/ProductoPublico.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { obtenerProductoPublico } from "@/servicios/catalogo";
import type {
    ProductoPublicoDetalleDTO,
    PresentacionPublicaDTO,
} from "@/types/catalogo-publico";

//  IMPORTARÁS esto cuando creemos el contexto del carrito (siguiente paso)
import { useCart } from "@/context/cart"; // <-- lo crearemos luego

/* ============ helpers ============ */
function Precio({ value }: { value?: number | null }) {
    if (value == null) return <span className="text-muted">—</span>;
    return <span className="font-semibold">Bs. {Number(value).toLocaleString()}</span>;
}

function fmtContenido(v: PresentacionPublicaDTO) {
    const cantidad = v.contenidoPorUnidad != null ? String(v.contenidoPorUnidad) : null;
    const simbolo = (v as any).unidadSimbolo as string | undefined;
    const nombre = (v as any).unidadNombre as string | undefined;
    const unidadStr = (simbolo && simbolo.trim()) || (nombre && nombre.trim()) || undefined;
    if (cantidad && unidadStr) return `${cantidad} ${unidadStr}`;
    if (cantidad) return cantidad;
    return "—";
}

/* ============ Galería ============ */
function Gallery({
                     portada,
                     presentaciones,
                     desc,
                 }: {
    portada?: string | null;
    presentaciones: PresentacionPublicaDTO[];
    desc?: string | null;
}) {
    const thumbs = useMemo(() => {
        const arr: string[] = [];
        if (portada) arr.push(portada);
        for (const v of presentaciones) {
            if (v.imagenUrl && !arr.includes(v.imagenUrl)) arr.push(v.imagenUrl);
        }
        return arr;
    }, [portada, presentaciones]);

    const [sel, setSel] = useState(0);
    const [openDesc, setOpenDesc] = useState<boolean>(!!desc); // overlay (solo desktop) abierto por defecto
    const [dir, setDir] = useState<1 | -1>(1); // dirección de animación
    const [enter, setEnter] = useState(true);  // fase de animación

    useEffect(() => setSel(0), [portada, presentaciones?.length]);

    // animación suave al cambiar selección
    useEffect(() => {
        setEnter(false);
        const t = setTimeout(() => setEnter(true), 20);
        return () => clearTimeout(t);
    }, [sel, dir]);

    const hasMany = thumbs.length > 1;

    // Swipe en móvil
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX == null || !hasMany) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 30) {
            if (dx < 0) {
                setDir(1);
                setSel((i) => (i + 1) % thumbs.length);
            } else {
                setDir(-1);
                setSel((i) => (i - 1 + thumbs.length) % thumbs.length);
            }
        }
        setTouchStartX(null);
    };

    return (
        <div className="space-y-3 md:max-w-[520px]">
            <div
                className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--light-bg)]"
                tabIndex={0}
                onKeyDown={(e) => {
                    // Soporte teclado (PC), sin flechas visibles
                    if (!hasMany) return;
                    if (e.key === "ArrowLeft") {
                        setDir(-1);
                        setSel((i) => (i - 1 + thumbs.length) % thumbs.length);
                    }
                    if (e.key === "ArrowRight") {
                        setDir(1);
                        setSel((i) => (i + 1) % thumbs.length);
                    }
                }}
            >
                {/* Móvil & Desktop: 4/3 para que quepa overlay + thumbs sin scroll interno */}
                <div
                    className="aspect-[4/3] w-full bg-black/10"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {thumbs.length ? (
                        <div style={{ height: "100%", width: "100%", position: "relative" }}>
                            <img
                                key={sel}
                                src={`${thumbs[sel]}?big=${sel}`}
                                alt="Imagen"
                                className="absolute inset-0 h-full w-full select-none object-contain"
                                draggable={false}
                                style={{
                                    transition: "transform 320ms ease, opacity 320ms ease",
                                    opacity: enter ? 1 : 0,
                                    transform: enter ? "translateX(0)" : `translateX(${dir * 24}px)`,
                                }}
                            />
                        </div>
                    ) : (
                        <div className="grid h-full w-full place-items-center text-sm text-muted">Sin imagen</div>
                    )}
                </div>

                {/* Overlay descripción SOLO en desktop (md+) */}
                {desc && openDesc && (
                    <div
                        className="absolute inset-0 z-10 hidden md:flex items-end bg-black/20 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="m-3 max-h-[70%] w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-base font-semibold">Descripción</h3>
                                <button
                                    onClick={() => setOpenDesc(false)}
                                    className="rounded-md border border-[var(--border)] px-2 py-1 text-sm hover:bg-[var(--fg)]/5"
                                >
                                    Cerrar
                                </button>
                            </div>
                            <div className="whitespace-pre-line leading-relaxed text-muted">{desc}</div>
                        </div>
                    </div>
                )}

                {/* Botón para abrir descripción SOLO en desktop (cuando está cerrada) */}
                {desc && !openDesc && (
                    <button
                        onClick={() => setOpenDesc(true)}
                        className="absolute bottom-3 right-3 z-10 hidden md:inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1.5 text-sm text-[var(--fg)] backdrop-blur transition hover:bg-[var(--surface)]"
                        aria-haspopup="dialog"
                        aria-expanded={openDesc}
                        title="Ver descripción"
                    >
                        Descripción
                    </button>
                )}
            </div>

            {/* Thumbs (PC y móvil) */}
            {thumbs.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {thumbs.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (i === sel) return;
                                setDir(i > sel ? 1 : -1);
                                setSel(i);
                            }}
                            className={`aspect-square overflow-hidden rounded-lg border ${
                                sel === i ? "border-emerald-600" : "border-[var(--border)] hover:border-emerald-700/60"
                            }`}
                            aria-label={`Imagen ${i + 1}`}
                        >
                            <img
                                src={`${t}?thumb=${i}`}
                                alt={`thumb-${i}`}
                                className="h-full w-full select-none object-cover"
                                draggable={false}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ============ Tarjeta de Presentación ============ */
function PresentacionCard({
                              v,
                              onAdd,
                          }: {
    v: PresentacionPublicaDTO;
    onAdd: (v: PresentacionPublicaDTO) => void;
}) {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="no-copy-img aspect-square w-full overflow-hidden rounded-lg bg-black/10">
                {v.imagenUrl ? (
                    <img
                        src={`${v.imagenUrl}?vp=${v.idPresentacion}`}
                        alt={v.codigoSku || String(v.idPresentacion)}
                        className="h-full w-full select-none object-cover"
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="grid h-full w-full place-items-center text-[11px] text-muted">—</div>
                )}
            </div>
            <div className="min-w-0">
                <div className="line-clamp-1 text-[13px] font-medium text-fg">
                    {v.codigoSku || `#${v.idPresentacion}`}
                </div>
                <div className="text-[12px] text-muted">Contenido: {fmtContenido(v)}</div>
                <div className="mt-1 text-[13px]">
                    <Precio value={v.precioVentaBob as any} />
                </div>
            </div>
            <div className="mt-1">
                <button
                    className="w-full rounded-full border border-[var(--primary-color)] px-3 py-1.5 text-[12px] text-[var(--primary-color)] transition hover:bg-[var(--primary-color)] hover:text-white"
                    onClick={() => onAdd(v)}
                >
                    Agregar
                </button>
            </div>
        </div>
    );
}

/* ============ Página ============ */
export default function ProductoPublico() {
    const { id } = useParams();
    const [p, setP] = useState<ProductoPublicoDetalleDTO | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // ✅ del contexto que crearemos enseguida
    const { addItem } = useCart();
    const [added, setAdded] = useState<string | null>(null); // toast simple

    useEffect(() => {
        const idNum = Number(id);
        if (!id || Number.isNaN(idNum)) {
            setErr("Producto inválido");
            setLoading(false);
            return;
        }
        let alive = true;
        setLoading(true);
        setErr(null);
        obtenerProductoPublico(idNum)
            .then((data) => alive && setP(data))
            .catch((e: any) => alive && setErr(e?.message || "No se pudo cargar el producto"))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [id]);

    function handleAdd(v: PresentacionPublicaDTO) {
        if (!p) return;
        addItem({
            idPresentacion: v.idPresentacion,
            nombreProducto: p.nombreProducto,
            codigoSku: v.codigoSku ?? null,
            contenido: fmtContenido(v),
            precioUnitBob: v.precioVentaBob ?? null,
            imagenUrl: v.imagenUrl || p.imagenUrl || null,
            cantidad: 1,
        });
        setAdded(`${p.nombreProducto} – ${v.codigoSku ?? "#" + v.idPresentacion}`);
        setTimeout(() => setAdded(null), 1600);
    }

    if (loading) {
        return (
            <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="animate-pulse overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--light-bg)]">
                        <div className="aspect-[4/3] w-full bg-black/10 md:aspect-[4/3]" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-8 w-2/3 rounded bg-black/10" />
                        <div className="h-4 w-1/2 rounded bg-black/10" />
                        <div className="h-4 w-4/5 rounded bg-black/10" />
                        <div className="mt-4 h-40 rounded-xl border border-[var(--border)] bg-black/5" />
                    </div>
                </div>
            </section>
        );
    }
    if (err) return <div className="mx-auto max-w-7xl px-4 py-8 text-red-600 dark:text-red-200">{err}</div>;
    if (!p) return <div className="mx-auto max-w-7xl px-4 py-8 text-muted">Sin datos.</div>;

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            {/* Migas */}
            <nav className="mb-4 text-sm text-muted">
                <Link to="/soyanga/catalogo" className="hover:underline">
                    Catálogo
                </Link>
                <span className="mx-2">/</span>
                <span className="text-[var(--fg)]/90">{p.nombreProducto}</span>
            </nav>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Izquierda: galería STICKY */}
                <div className="lg:sticky lg:top-20 lg:self-start">
                    <Gallery
                        portada={p.imagenUrl}
                        presentaciones={p.presentaciones ?? []}
                        desc={p.descripcion ?? null}
                    />
                </div>

                {/* Derecha */}
                <div className="min-w-0">
                    {/* Título */}
                    <h1 className="text-xl font-bold text-fg sm:text-2xl md:text-3xl">{p.nombreProducto}</h1>

                    {/* Chips */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {p.categoriaNombre && (
                            <span className="rounded-full border border-[var(--border)] bg-[var(--light-bg)] px-3 py-1 text-xs text-muted">
                {p.categoriaNombre}
              </span>
                        )}
                        {p.registroSanitario && (
                            <span className="rounded-full border border-[var(--border)] bg-[var(--light-bg)] px-3 py-1 text-xs text-muted">
                Reg. Sanitario: {p.registroSanitario}
              </span>
                        )}
                    </div>

                    {/* Principio activo — ANTES de las tarjetas */}
                    {p.principioActivo && (
                        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                            <div className="text-sm font-semibold text-fg">Principio activo</div>
                            <div className="mt-1 whitespace-pre-line text-sm text-muted">{p.principioActivo}</div>
                        </div>
                    )}

                    {/* Presentaciones */}
                    <div className="mt-5">
                        {p.presentaciones?.length ? (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {p.presentaciones.map((v) => (
                                    <PresentacionCard key={v.idPresentacion} v={v} onAdd={handleAdd} />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center text-muted">
                                Sin presentaciones registradas.
                            </div>
                        )}
                    </div>

                    {/* Descripción SOLO en móvil, debajo de las tarjetas */}
                    {p.descripcion && (
                        <details open className="md:hidden mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                            <summary className="cursor-pointer list-none text-sm font-semibold">
                                Descripción
                            </summary>
                            <div className="mt-2 whitespace-pre-line leading-relaxed text-muted">
                                {p.descripcion}
                            </div>
                        </details>
                    )}

                    {/* Toast simple */}
                    {added && (
                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 shadow">
                            <span className="text-sm">Agregado: {added}</span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
