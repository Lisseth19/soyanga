import { Link, NavLink, Outlet } from "react-router-dom";
import logo from "@/assets/logo.jpeg"; // si usas logo

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "no-underline px-3 py-2 rounded-lg text-sm font-medium transition-colors",
    isActive
      ? "bg-emerald-600 text-white shadow-sm"   // activo: pill verde
      : "text-emerald-700 hover:bg-emerald-50", // inactivo: texto verde
  ].join(" ");
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        <nav className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          {/* Brand */}
          <Link to="/" className="mr-4 flex items-center gap-2 no-underline">
            <img src={logo} alt="Soyanga" className="h-7 w-auto" />
            <span className="text-emerald-700 font-semibold tracking-wide">SOYANGA</span>
          </Link>

          {/* Nav (todos con NavLink + navClass) */}
          <div className="flex items-center gap-1">
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
            <NavLink to="/salud" className={navClass}>
              API Health
            </NavLink>
          </div>

          <div className="ml-auto" />
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

