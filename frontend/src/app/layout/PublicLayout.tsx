// src/layouts/PublicLayout.tsx
import { Outlet, NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logoP from "@/assets/logoP.png";
import { useCart } from "@/context/cart"; // NUEVO

type Theme = "light" | "dark";

function navClass({ isActive }: { isActive: boolean }) {
    return [
        "no-underline whitespace-nowrap rounded-md border transition-colors",
        "px-3 py-1.5 sm:px-3.5 sm:py-2",
        "text-xs sm:text-sm",
        isActive
            ? "bg-[var(--primary-color)]/15 text-[var(--fg)] border-[var(--primary-color)]/35"
            : "text-[color:var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--fg)]/5 border-transparent",
    ].join(" ");
}

function LogoBadge({ theme, size = "sm" }: { theme: Theme; size?: "sm" | "md" }) {
    const pad = size === "sm" ? "p-1.5" : "p-2";
    const imgSize = size === "sm" ? "h-9 w-9" : "h-12 w-12";
    const bg = theme === "dark" ? "#0b1220" : "#0b3d2e";

    return (
        <div
            className={`rounded-full ${pad} ring-1`}
            style={{
                backgroundColor: bg,
                boxShadow: theme === "dark" ? "0 0 0 1px rgba(0,0,0,.35)" : "0 0 0 1px rgba(0,0,0,.12)",
            } as React.CSSProperties}
            title="Soyanga"
        >
            <img src={logoP} alt="Soyanga" className={`${imgSize} object-contain select-none`} draggable={false} />
        </div>
    );
}

export default function PublicLayout() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("ui.theme") as Theme | null;
        if (saved === "light" || saved === "dark") return saved;
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

    // ⬇️ NUEVO: contador del carrito
    const { count } = useCart();

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("ui.theme", theme);
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

    // ===== Helper de clases para el botón de carrito (desktop/móvil) =====
    const cartBtnClass = (isActive: boolean, size: "desktop" | "mobile") => {
        const common =
            "relative grid place-items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/40";
        const dims = size === "desktop" ? "h-10 w-10" : "h-11 w-11";

        if (isActive) {
            // Activo (estamos en /soyanga/cotizacion): fondo claro, borde y texto en color primario
            return `${common} ${dims} bg-white border border-[var(--primary-color)] text-[var(--primary-color)] shadow-sm hover:bg-white/90`;
        }
        // Inactivo
        return `${common} ${dims} bg-[var(--primary-color)] hover:opacity-90 text-white`;
    };

    return (
        <div className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--fg)]">
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
                    {/* ===== Desktop (md+): una sola fila ===== */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/soyanga/inicio" className="flex items-center gap-2 no-underline">
                            <LogoBadge theme={theme} size="sm" />
                            <span className="text-lg font-bold tracking-tight">Soyanga</span>
                        </Link>

                        {/* Nav centrado */}
                        <nav className="mx-auto flex items-center gap-2">
                            <NavLink to="/soyanga/inicio" className={navClass}>Inicio</NavLink>
                            <NavLink to="/soyanga/catalogo" className={navClass}>Catálogo</NavLink>
                            <NavLink to="/soyanga/metodos" className={navClass}>Métodos de pago</NavLink>
                            <NavLink to="/soyanga/contacto" className={navClass}>Contáctanos</NavLink>
                        </nav>

                        {/* Acciones a la derecha */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
                                aria-label="Cambiar tema"
                                className="h-10 w-10 grid place-items-center rounded-full border border-[var(--border)] hover:bg-[var(--fg)]/5 transition"
                            >
                                {theme === "dark" ? (
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                    </svg>
                                )}
                            </button>

                            {/* Carrito / Cotización (Desktop) */}
                            <NavLink
                                to="/soyanga/cotizacion"
                                aria-label="Carrito / Cotización"
                                title="Ver cotización"
                                className={({ isActive }) => cartBtnClass(isActive, "desktop")}
                            >
                                {({ isActive }) => (
                                    <>
                                        <svg
                                            className={`w-5 h-5 ${isActive ? "text-[var(--primary-color)]" : "text-white"}`}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                        >
                                            <path d="M6 6h15l-1.5 9h-12z" />
                                            <circle cx="9" cy="20" r="1" />
                                            <circle cx="18" cy="20" r="1" />
                                        </svg>
                                        {/* Badge conteo */}
                                        {count > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold grid place-items-center">
                        {count > 99 ? "99+" : count}
                      </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </div>
                    </div>

                    {/* ===== Móvil (por debajo de md): dos filas ===== */}
                    <div className="md:hidden space-y-2">
                        {/* Fila 1: logo + tema + carrito */}
                        <div className="flex items-center gap-2">
                            <Link to="/soyanga/inicio" className="flex items-center gap-2 no-underline flex-shrink-0">
                                <LogoBadge theme={theme} size="md" />
                                <span className="text-xl font-bold tracking-tight">Soyanga</span>
                            </Link>

                            <div className="ml-auto flex items-center gap-2">
                                <button
                                    onClick={toggleTheme}
                                    title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
                                    aria-label="Cambiar tema"
                                    className="h-11 w-11 grid place-items-center rounded-full border border-[var(--border)] hover:bg-[var(--fg)]/5 transition"
                                >
                                    {theme === "dark" ? (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                                            <circle cx="12" cy="12" r="4" />
                                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Carrito / Cotización (Móvil) */}
                                <NavLink
                                    to="/soyanga/cotizacion"
                                    aria-label="Carrito / Cotización"
                                    title="Ver cotización"
                                    className={({ isActive }) => cartBtnClass(isActive, "mobile")}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <svg
                                                className={`w-6 h-6 ${isActive ? "text-[var(--primary-color)]" : "text-white"}`}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.7"
                                            >
                                                <path d="M6 6h15l-1.5 9h-12z" />
                                                <circle cx="9" cy="20" r="1" />
                                                <circle cx="18" cy="20" r="1" />
                                            </svg>
                                            {/* Badge conteo */}
                                            {count > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold grid place-items-center">
                          {count > 99 ? "99+" : count}
                        </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            </div>
                        </div>

                        {/* Fila 2: navegación con scroll horizontal */}
                        <nav className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar">
                            <NavLink to="/soyanga/inicio" className={navClass}>Inicio</NavLink>
                            <NavLink to="/soyanga/catalogo" className={navClass}>Catálogo</NavLink>
                            <NavLink to="/soyanga/metodos" className={navClass}>Métodos de pago</NavLink>
                            <NavLink to="/soyanga/contacto" className={navClass}>Contáctanos</NavLink>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="mt-auto border-t border-[var(--border)] py-5 text-sm text-[color:var(--muted)]">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
                    <span>© {new Date().getFullYear()} Soyanga. Todos los derechos reservados.</span>
                    <span className="hidden sm:inline">Build: Frontend (Vite + React + TS)</span>
                </div>
            </footer>
        </div>
    );
}
