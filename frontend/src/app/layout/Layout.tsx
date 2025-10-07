import { Link, NavLink, Outlet } from "react-router-dom";
import logo from "@/assets/logo.jpeg";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "flex-none no-underline px-3 py-2 rounded-lg text-sm font-medium transition-colors",
    isActive
      ? "bg-emerald-600 text-white shadow-sm"
      : "text-emerald-700 hover:bg-emerald-50",
  ].join(" ");
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        <nav className="mx-auto max-w-7xl px-4 py-3 relative">
          {/* gradientes laterales (estética) */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent" />

          <div className="flex items-center gap-3">
            {/* Brand */}
            <Link to="/" className="mr-2 flex-none flex items-center gap-2 no-underline">
              <img src={logo} alt="Soyanga" className="h-7 w-auto" />
              <span className="text-emerald-700 font-semibold tracking-wide">SOYANGA</span>
            </Link>

            {/* SCROLLER: tabs horizontales */}
            <div
              className="
                -mx-4 px-4       /* que el scroll ocupe de borde a borde */
                flex gap-1 min-w-0 flex-1
                overflow-x-auto whitespace-nowrap scrollbar-none
              "
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <NavLink to="/inventario/por-lote" className={navClass}>
                Inventario por lote
              </NavLink>
              <NavLink to="/sucursales" className={navClass}>
                Sucursales
              </NavLink>
              <NavLink to="/catalogo/almacenes" className={navClass}>
                Almacenes
              </NavLink>
              <NavLink to="/catalogo/categorias" className={navClass}>
                Categorias
              </NavLink>
              <NavLink to="/catalogo/monedas" className={navClass}>
                Monedas
              </NavLink>
            <NavLink to="/clientes" className={navClass}>
              Clientes
            </NavLink>
            <NavLink to="/proveedores" className={navClass}>
              Proveedores
            </NavLink>
              <NavLink to="/inventario/productos" className={navClass}>
                Productos
              </NavLink>
              <NavLink to="/catalogo/unidades" className={navClass}>
                Unidades
              </NavLink>
              <NavLink to="/catalogo/presentaciones" className={navClass}>Presentaciones</NavLink>

              <NavLink to="/salud" className={navClass}>
                API Health
              </NavLink>
            </div>

            <div className="ml-auto" />
          </div>
        </nav>
        <div className="h-0.5 bg-emerald-600/90" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-neutral-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Soyanga</span>
          <span className="hidden sm:inline">Build: Frontend (Vite + React + TS)</span>
        </div>
      </footer>
    </div>
  );
}
