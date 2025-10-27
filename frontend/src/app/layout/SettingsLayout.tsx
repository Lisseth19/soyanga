// src/app/layout/SettingsLayout.tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FolderCog, Warehouse, Building2, DollarSign, Coins,
  Layers3, Package, Ruler, Tags, Barcode, ChevronDown
} from "lucide-react";
import { useMemo, useState } from "react";

function itemClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
    isActive
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "text-neutral-700 hover:bg-neutral-50",
  ].join(" ");
}

type Section = "config" | "catalogo";

export default function SettingsLayout() {
  const { pathname } = useLocation();
  const section: Section = pathname.startsWith("/catalogo") ? "catalogo" : "config";

  // abrir por defecto según la ruta actual
  const startsEstructura = useMemo(() => pathname.startsWith("/config/estructura"), [pathname]);
  const startsFinanzas   = useMemo(() => pathname.startsWith("/config/finanzas"), [pathname]);
  const startsCatalogo   = useMemo(() => pathname.startsWith("/catalogo"), [pathname]);

  const [openEstructura, setOpenEstructura] = useState<boolean>(startsEstructura || (!startsFinanzas && !startsCatalogo));
  const [openFinanzas, setOpenFinanzas]     = useState<boolean>(startsFinanzas);
  const [openCatalogo, setOpenCatalogo]     = useState<boolean>(startsCatalogo);

  return (
    <div className="px-0 py-6">{/* sin padding horizontal para pegar a la izquierda */}
      <div className="grid grid-cols-12 gap-6 pr-6">{/* respiración a la derecha */}
        {/* SIDEBAR (columna izquierda pegada al borde) */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
              <FolderCog size={18} /> {section === "config" ? "Configuración" : "Catálogo"}
            </div>

            {/* ====== ESTRUCTURA ====== */}
            <button
              type="button"
              onClick={() => setOpenEstructura(v => !v)}
              className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
              aria-expanded={openEstructura}
            >
              <span>ESTRUCTURA</span>
              <ChevronDown size={16} className={`transition-transform ${openEstructura ? "rotate-180" : ""}`} />
            </button>
            <nav className={`flex flex-col gap-1 mb-3 ${openEstructura ? "" : "hidden"}`}>
              <NavLink to="/config/estructura/sucursales" className={itemClass}>
                <Building2 size={16}/> Sucursales
              </NavLink>
              <NavLink to="/config/estructura/almacenes" className={itemClass}>
                <Warehouse size={16}/> Almacenes
              </NavLink>
            </nav>

            {/* ====== FINANZAS ====== */}
            <button
              type="button"
              onClick={() => setOpenFinanzas(v => !v)}
              className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
              aria-expanded={openFinanzas}
            >
              <span>FINANZAS</span>
              <ChevronDown size={16} className={`transition-transform ${openFinanzas ? "rotate-180" : ""}`} />
            </button>
            <nav className={`flex flex-col gap-1 mb-3 ${openFinanzas ? "" : "hidden"}`}>
              <NavLink to="/config/finanzas/monedas" className={itemClass}>
                <DollarSign size={16}/> Monedas
              </NavLink>
              <NavLink to="/config/finanzas/tipos-cambio" className={itemClass}>
                <Coins size={16}/> Tipos de Cambio
              </NavLink>
            </nav>

            {/* ====== CATÁLOGO ====== */}
            <button
              type="button"
              onClick={() => setOpenCatalogo(v => !v)}
              className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
              aria-expanded={openCatalogo}
            >
              <span>CATÁLOGO</span>
              <ChevronDown size={16} className={`transition-transform ${openCatalogo ? "rotate-180" : ""}`} />
            </button>
            <nav className={`flex flex-col gap-1 ${openCatalogo ? "" : "hidden"}`}>
              <NavLink to="/catalogo" end className={itemClass}>
                <Layers3 size={16}/> Inicio del Catálogo
              </NavLink>
              <NavLink to="/catalogo/categorias" className={itemClass}>
                <Tags size={16}/> Categorías
              </NavLink>
              <NavLink to="/catalogo/productos" className={itemClass}>
                <Package size={16}/> Productos
              </NavLink>
              <NavLink to="/catalogo/unidades" className={itemClass}>
                <Ruler size={16}/> Unidades de medida
              </NavLink>
              <NavLink to="/catalogo/presentaciones" className={itemClass}>
                <Layers3 size={16}/> Presentaciones
              </NavLink>
              <NavLink to="/catalogo/codigos-barras" className={itemClass}>
                <Barcode size={16}/> Códigos de barras
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
