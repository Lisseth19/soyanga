// src/paginas/publico/InicioPublico.tsx
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import agroImg from "@/assets/agro.jpg";
import agro2 from "@/assets/agro2.jpg";
import agro3 from "@/assets/agro3.jpg";

/* ======================= */
/*    Iconos de redes      */
/* ======================= */
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9c1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5V12h2.8l-.45 2.9h-2.35v7A10 10 0 0 0 22 12Z" />
        </svg>
    );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10a5 5 0 0 0 0-10Zm6.5-.25a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 0 0 0-2.5ZM12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
        </svg>
    );
}
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
            <path d="M30 5a12.9 12.9 0 0 0 9 4V16a20 20 0 0 1-9-3.1V29a11 11 0 1 1-11-11a11.2 11.2 0 0 1 2 .2v7a4 4 0 1 0 2 3.5V5Z"/>
        </svg>
    );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3L4 5v7c0 6 8 10 8 10Z" />
        </svg>
    );
}
function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M10 17h4" />
            <path d="M3 17h1a4 4 0 0 0 8 0h4a4 4 0 0 0 8 0h1" />
            <path d="M3 17V6a2 2 0 0 1 2-2h11v10" />
            <path d="M18 8h2a2 2 0 0 1 2 2v7" />
        </svg>
    );
}

/* ======================= */
/*    Carrusel (Hero)      */
/* ======================= */
function HeroCarousel({
                          slides,
                          intervalMs = 4500,
                          resumeDelayMs = 3000,
                      }: {
    slides: string[];
    intervalMs?: number;
    resumeDelayMs?: number;
}) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [idx, setIdx] = useState(0);

    const idxRef = useRef(0);
    const pausedRef = useRef(false);
    const timerRef = useRef<number | null>(null);
    const resumeTimerRef = useRef<number | null>(null);

    const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scrollToIndex = (i: number) => {
        const node = trackRef.current;
        if (!node) return;
        const w = node.clientWidth;
        node.scrollTo({ left: i * w, behavior: "smooth" });
    };

    const clearTimers = () => {
        if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
        if (resumeTimerRef.current) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; } // ← FIX
    };

    const startAutoplay = () => {
        if (prefersReduced || slides.length <= 1) return;
        clearTimers();
        timerRef.current = window.setInterval(() => {
            if (pausedRef.current) return;
            const next = (idxRef.current + 1) % slides.length;
            idxRef.current = next;
            setIdx(next);
            scrollToIndex(next);
        }, intervalMs) as unknown as number;
    };

    const pauseAutoplay = () => {
        pausedRef.current = true;
        if (resumeTimerRef.current) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
    };
    const resumeAutoplayDelayed = () => {
        if (prefersReduced) return;
        if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = window.setTimeout(() => { pausedRef.current = false; }, resumeDelayMs) as unknown as number;
    };

    useEffect(() => {
        startAutoplay();
        return () => clearTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides.length, intervalMs, prefersReduced]);

    useEffect(() => { idxRef.current = idx; }, [idx]);

    useEffect(() => {
        const node = trackRef.current;
        if (!node) return;
        const ro = new ResizeObserver(() => scrollToIndex(idxRef.current));
        ro.observe(node);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const node = trackRef.current;
        if (!node) return;
        let raf = 0;
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const { scrollLeft, clientWidth } = node;
                const newIdx = Math.round(scrollLeft / clientWidth);
                if (newIdx !== idxRef.current) {
                    idxRef.current = newIdx;
                    setIdx(newIdx);
                }
            });
        };
        node.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            node.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <div className="relative rounded-xl overflow-hidden ring-1 ring-[var(--border)] shadow-[0_20px_50px_-24px_rgba(0,0,0,.35)]">
            <div
                ref={trackRef}
                className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar select-none"
                style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
                onMouseEnter={pauseAutoplay}
                onMouseLeave={resumeAutoplayDelayed}
                onTouchStart={pauseAutoplay}
                onTouchEnd={resumeAutoplayDelayed}
            >
                {slides.map((src, i) => (
                    <div key={i} className="shrink-0 w-full snap-start">
                        <div className="relative aspect-video">
                            <img
                                src={src}
                                alt={`Slide ${i + 1}`}
                                className="h-full w-full object-cover select-none"
                                loading={i === 0 ? "eager" : "lazy"}
                                decoding={i === 0 ? "auto" : "async"}
                                draggable={false}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-black/15" />
                        </div>
                    </div>
                ))}
            </div>

            {slides.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            aria-label={`Ir al slide ${i + 1}`}
                            onClick={() => {
                                setIdx(i);
                                idxRef.current = i;
                                scrollToIndex(i);
                                resumeAutoplayDelayed();
                            }}
                            className={`h-2.5 rounded-full transition-all ${
                                idx === i ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ======================= */
/*     Página de Inicio    */
/* ======================= */
export default function InicioPublico() {
    const slides = useMemo(() => [agroImg, agro2, agro3], []);

    return (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
            {/* ======= HERO ======= */}
            <div className="grid items-center gap-10 lg:grid-cols-2">
                {/* Columna de texto */}
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--light-bg)]/60 px-3 py-1.5 mb-4">
                        <span className="text-sm text-[var(--muted)]">🌿 Soluciones para el agro</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[var(--fg)]">
                        Bienvenido a <span className="text-[var(--primary-color)]">Soyanga</span>
                    </h1>

                    <p className="mb-6 text-[var(--muted)] leading-relaxed">
                        Agroimportación Soyanga ofrece <span className="font-medium text-[var(--fg)]/90">agroinsumos confiables</span> y
                        asesoría cercana. Explora el catálogo, arma tu cotización y recíbela por{" "}
                        <span className="font-medium text-[var(--fg)]/90">WhatsApp o PDF</span>, de forma rápida y profesional.
                    </p>

                    {/* Botones CTA */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/soyanga/catalogo"
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-color)] px-5 py-2.5 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition"
                        >
                            Ver catálogo
                        </Link>
                        <Link
                            to="/soyanga/cotizacion"
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-color)] px-5 py-2.5 text-white hover:opacity-90 transition"
                        >
                            Armar cotización
                        </Link>
                        <Link
                            to="/soyanga/contacto"
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-[var(--fg)] hover:bg-black/5 transition"
                        >
                            Contáctanos
                        </Link>
                    </div>

                    {/* Carrusel SOLO en móvil, debajo de los botones */}
                    <div className="mt-6 block lg:hidden" aria-hidden={false}>
                        <HeroCarousel slides={slides} />
                    </div>

                    {/* Sellos de confianza */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                            <ShieldIcon className="h-5 w-5 text-[var(--primary-color)]" />
                            <div className="text-sm">
                                <div className="font-semibold">Productos confiables</div>
                                <div className="text-[12px] text-[var(--muted)]">Stock controlado y respaldo técnico</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                            <TruckIcon className="h-5 w-5 text-[var(--primary-color)]" />
                            <div className="text-sm">
                                <div className="font-semibold">Cobertura Santa Cruz</div>
                                <div className="text-[12px] text-[var(--muted)]">Envío/retira según disponibilidad</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                            <CheckIcon className="h-5 w-5 text-[var(--primary-color)]" />
                            <div className="text-sm">
                                <div className="font-semibold">Compra sencilla</div>
                                <div className="text-[12px] text-[var(--muted)]">Cotiza por WhatsApp o PDF</div>
                            </div>
                        </div>
                    </div>

                    {/* Redes sociales */}
                    <div className="mt-6">
                        <div className="text-sm font-semibold mb-2">Síguenos</div>
                        <div className="flex items-center gap-2">
                            <a
                                href="#"
                                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--fg)]/5"
                                title="Facebook"
                            >
                                <FacebookIcon className="h-4 w-4" />
                                <span>Facebook</span>
                            </a>
                            <a
                                href="#"
                                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--fg)]/5"
                                title="Instagram"
                            >
                                <InstagramIcon className="h-4 w-4" />
                                <span>Instagram</span>
                            </a>
                            <a
                                href="#"
                                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--fg)]/5"
                                title="TikTok"
                            >
                                <TikTokIcon className="h-4 w-4" />
                                <span>TikTok</span>
                            </a>
                        </div>
                        <p className="mt-1 text-[12px] text-[var(--muted)]">*Actualiza los enlaces con tus URLs oficiales.*</p>
                    </div>
                </div>

                {/* Carrusel SOLO en desktop (columna derecha) */}
                <div className="hidden lg:block">
                    <HeroCarousel slides={slides} />
                </div>
            </div>

            {/* ======= Sección informativa / Cómo funciona ======= */}
            <section className="mt-12 grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-sm font-semibold">1) Explora el catálogo</div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        Revisa presentaciones, contenido por unidad y precios de referencia. Todo en un solo lugar.
                    </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-sm font-semibold">2) Agrega a cotización</div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        Elige las presentaciones que necesitas. Edita cantidades antes de enviar.
                    </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-sm font-semibold">3) Recíbela al instante</div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        Envíala por WhatsApp o descárgala en PDF con formato profesional y listo. ¡Rápido y claro!
                    </p>
                </div>
            </section>
        </section>
    );
}
