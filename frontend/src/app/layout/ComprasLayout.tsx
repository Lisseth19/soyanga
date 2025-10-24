// src/app/layout/ComprasLayout.tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  ShoppingBag,    // título módulo
  Users2,          // proveedores
  ClipboardList,   // pedidos
  PackageCheck,    // recepciones
  ChevronDown
} from "lucide-react";

function itemClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
    isActive
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "text-neutral-700 hover:bg-neutral-50",
  ].join(" ");
}

export default function ComprasLayout() {
  const { pathname } = useLocation();

  // abrir por defecto según la ruta actual
  const startsCompras = useMemo(() => pathname.startsWith("/compras"), [pathname]);
  const [openCompras, setOpenCompras] = useState<boolean>(startsCompras || true);

  return (
    <div className="px-0 py-6">
      <div className="grid grid-cols-12 gap-6 pr-6">
        {/* SIDEBAR */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
              <ShoppingBag size={18} /> Compras
            </div>

            {/* ====== GESTIÓN ====== */}
            <button
              type="button"
              onClick={() => setOpenCompras(v => !v)}
              className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
              aria-expanded={openCompras}
            >
              <span>Gestión</span>
              <ChevronDown size={16} className={`transition-transform ${openCompras ? "rotate-180" : ""}`} />
            </button>

            <nav className={`flex flex-col gap-1 ${openCompras ? "" : "hidden"}`}>
              <NavLink to="/compras/proveedores" className={itemClass}>
                <Users2 size={16} /> Proveedores
              </NavLink>
              <NavLink to="/compras/pedidos" className={itemClass}>
                <ClipboardList size={16} /> Pedidos de compra
              </NavLink>
              
            </nav>
          </div>
        </aside>

        {/* CONTENT */}
        <section className="col-span-12 md:col-span-9 lg:col-span-9">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
