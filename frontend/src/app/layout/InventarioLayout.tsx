import { NavLink, Outlet } from "react-router-dom";
import { Boxes, Settings2, ArrowLeftRight, BellRing } from "lucide-react"; // ← ícono nuevo

function itemClass(isActive: boolean) {
  return [
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline transition-colors",
    isActive ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50",
  ].join(" ");
}

export default function InventarioLayout() {
  return (
    <div className="py-6">
      <div className="grid grid-cols-12 gap-4">
        {/* SIDEBAR */}
        <aside className="col-span-12 md:col-span-3">
          <div className="bg-white rounded-2xl border border-neutral-200 p-3">
            <div className="flex items-center gap-2 px-2 pb-2 text-xs font-semibold text-neutral-500 uppercase">
              <Boxes className="h-3.5 w-3.5" />
              Inventario
            </div>

            <nav className="flex flex-col gap-1">
              <NavLink to="ajustes" className={({ isActive }) => itemClass(isActive)}>
                <Settings2 className="h-4 w-4" />
                <span>Ajustes</span>
              </NavLink>

              <NavLink to="movimientos" className={({ isActive }) => itemClass(isActive)}>
                <ArrowLeftRight className="h-4 w-4" />
                <span>Movimiento entre almacenes</span>
              </NavLink>

              {/* Alertas → ícono representativo y ruta relativa */}
              <NavLink to="alertas" className={({ isActive }) => itemClass(isActive)}>
                <BellRing className="h-4 w-4" />
                <span>Alertas de stock</span>
              </NavLink>
            </nav>
          </div>
        </aside>

        {/* CONTENIDO */}
        <section className="col-span-12 md:col-span-9">
          <div className="bg-white rounded-2xl border border-neutral-200 p-4">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}
