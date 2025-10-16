// src/paginas/publico/InicioPublico.tsx
import { Link } from "react-router-dom";
import agroImg from "@/assets/agro.jpg";

export default function InicioPublico() {
    return (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
            <div className="grid items-center gap-10 lg:grid-cols-2">
                {/* Texto */}
                <div>
                    {/* Badge superior */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--light-bg)]/60 px-3 py-1.5 mb-4">
                        <span className="text-sm text-[var(--muted)]">🌿 Soluciones para el agro</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[var(--fg)]">
                        Bienvenido a Soyanga
                    </h1>

                    <p className="mb-6 text-[var(--muted)]">
                        Somos una empresa enfocada en agroinsumos y gestión de inventario. Aquí
                        encontrarás nuestro catálogo actualizado y podrás solicitar una cotización
                        fácilmente.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/soyanga/catalogo"
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-color)]
                         px-5 py-2.5 text-[var(--primary-color)]
                         hover:bg-[var(--primary-color)] hover:text-white transition"
                        >
                            Ver catálogo
                        </Link>

                        <Link
                            to="/soyanga/contacto"
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]
                         px-5 py-2.5 text-[var(--fg)] hover:bg-black/5 transition"
                        >
                            Contáctanos
                        </Link>
                    </div>
                </div>

                {/* Imagen */}
                <div className="rounded-xl overflow-hidden ring-1 ring-[var(--border)] shadow-[0_20px_50px_-24px_rgba(0,0,0,.35)]">
                    <div className="no-copy-img relative aspect-video">
                        <img
                            src={agroImg}
                            alt="Campo cultivado con tractor pulverizando en un día despejado"
                            className="h-full w-full object-cover select-none"
                            loading="lazy"
                            decoding="async"
                        />
                        {/* Velo sutil para legibilidad en ambas temáticas */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-black/10" />
                    </div>
                </div>
            </div>
        </section>
    );
}
