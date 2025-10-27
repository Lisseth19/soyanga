// src/app/layout/VentasLayout.tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    ShoppingCart,
    Receipt,
    PlusCircle,
    Banknote,
    Wallet,
    ChevronDown
} from "lucide-react";

function itemClass({ isActive }: { isActive: boolean }) {
    return [
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        isActive
            ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
            : "text-neutral-700 hover:bg-neutral-50",
    ].join(" ");
}

export default function VentasLayout() {
    const { pathname } = useLocation();
    const { can } = useAuth() as { can: (permiso: string) => boolean };

    // Sidebar abierto por defecto
    const [openVentas, setOpenVentas] = useState<boolean>(true);

    // Altura dinámica del header para que el sidebar sticky no quede tapado
    const [headerTop, setHeaderTop] = useState<number>(96); // fallback razonable

    useEffect(() => {
        const header = document.querySelector("header.sticky") as HTMLElement | null;

        const computeTop = () => {
            const h = header?.getBoundingClientRect().height ?? 0;
            // Pequeño margen extra para sombras/separación visual
            setHeaderTop((h || 0) + 12);
        };

        computeTop();

        // Recalcula si cambia el tamaño del header o la ventana
        let ro: ResizeObserver | undefined;
        if (header && "ResizeObserver" in window) {
            ro = new ResizeObserver(computeTop);
            ro.observe(header);
        }
        const onResize = () => computeTop();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            ro?.disconnect();
        };
    }, [pathname]);

    return (
        <div className="px-0 py-6">
            <div className="grid grid-cols-12 gap-6 pr-6">
                {/* SIDEBAR (FIJO/NO SE DESLIZA) */}
                <aside className="col-span-12 md:col-span-3 lg:col-span-3">
                    <div className="sticky z-10" style={{ top: headerTop }}>
                        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-sky-700 mb-3">
                                <ShoppingCart size={18} /> Ventas
                            </div>

                            {/* ====== GESTIÓN ====== */}
                            <button
                                type="button"
                                onClick={() => setOpenVentas(v => !v)}
                                className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                                aria-expanded={openVentas}
                            >
                                <span>Gestión</span>
                                <ChevronDown size={16} className={`transition-transform ${openVentas ? "rotate-180" : ""}`} />
                            </button>

                            <nav className={`flex flex-col gap-1 ${openVentas ? "" : "hidden"}`}>
                                {can("ventas:ver") && (
                                    <NavLink to="/ventas" end className={itemClass}>
                                        <Receipt size={16} /> Listado de ventas
                                    </NavLink>
                                )}
                                {can("ventas:crear") && (
                                    <NavLink to="/ventas/nueva" className={itemClass}>
                                        <PlusCircle size={16} /> Nueva venta
                                    </NavLink>
                                )}
                                {can("cobros:ver") && (
                                    <NavLink to="/ventas/cobros" className={itemClass}>
                                        <Banknote size={16} /> Cobros (CxC)
                                    </NavLink>
                                )}
                                {can("anticipos:ver") && (
                                    <NavLink to="/ventas/anticipos" className={itemClass}>
                                        <Wallet size={16} /> Anticipos
                                    </NavLink>
                                )}
                            </nav>
                        </div>
                    </div>
                </aside>

                {/* CONTENT (SE DESLIZA NORMAL) */}
                <section className="col-span-12 md:col-span-9 lg:col-span-9">
                    <Outlet />
                </section>
            </div>
        </div>
    );
}
