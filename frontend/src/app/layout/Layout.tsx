
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { onAuth } from "@/servicios/httpClient";
import { authService } from "@/servicios/auth";
import logo from "@/assets/logo.jpeg";

function navClass({ isActive }: { isActive: boolean }) {
  return [

    "no-underline px-3 py-2 rounded-lg text-sm font-medium transition-colors",
    isActive ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50",

  ].join(" ");
}

export default function AppLayout() {
  const navigate = useNavigate();
  // ⬇⬇⬇ ahora tomamos `can` del AuthContext
  const { user, logout, can } = useAuth() as {
    user: any | null;
    logout: () => void;
    can: (permiso: string) => boolean;
  };

  /** ======== Estado para modales de sesión ======== */
  const [expiringOpen, setExpiringOpen] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  // Cuenta regresiva visible en el modal “por expirar”
  const [countdown, setCountdown] = useState<number>(0);
  useEffect(() => {
    if (!expiringOpen) return;
    setCountdown(Math.max(1, Math.round(remainingMs / 1000)));
    const id = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 1)), 1000);
    return () => clearInterval(id);
  }, [expiringOpen, remainingMs]);

  /** ======== Listeners globales del httpClient ======== */
  useEffect(() => {
    const off1 = onAuth("auth:expiring", (ev) => {
      const ms = Number((ev as any)?.detail?.remainingMs ?? 0);
      setRemainingMs(ms);
      setExpiringOpen(true);
    });
    const off2 = onAuth("auth:refreshed", () => {
      setExpiringOpen(false);
      setExpiredOpen(false);
    });
    const off3 = onAuth("auth:expired", () => {
      setExpiringOpen(false);
      setExpiredOpen(true);
    });
    return () => { off1(); off2(); off3(); };
  }, []);

  /** ======== Acciones en modales ======== */
  async function continuarSesion() {
    try {
      const ok = await authService.refresh();
      if (ok) { setExpiringOpen(false); return; }
      setExpiringOpen(false);
      setExpiredOpen(true);
    } catch {
      setExpiringOpen(false);
      setExpiredOpen(true);
    }
  }
  function irALogin() { logout(); navigate("/login"); }

  /** ======== Render ======== */
  return (

      <div className="min-h-screen bg-white text-neutral-900">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            {/* Brand */}
            <Link to="/inicio" className="mr-4 flex items-center gap-2 no-underline">
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

              <NavLink to="/compras" className={navClass}>
                Compras
              </NavLink>

              <NavLink to="/salud" className={navClass}>
                API Health
              </NavLink>
            {/* Nav principal */}
            <div className="flex items-center gap-1">
              {/* Si quieres que estos también respeten permisos, usa can("...:ver") */}
              {can("inventario:ver")     && <NavLink to="/inventario/por-lote" className={navClass}>Inventario por lote</NavLink>}
              {can("sucursales:ver")     && <NavLink to="/sucursales" className={navClass}>Sucursales</NavLink>}
              {can("almacenes:ver")      && <NavLink to="/catalogo/almacenes" className={navClass}>Almacenes</NavLink>}
              {can("categorias:ver")     && <NavLink to="/catalogo/categorias" className={navClass}>Categorías</NavLink>}
              {can("monedas:ver")        && <NavLink to="/catalogo/monedas" className={navClass}>Monedas</NavLink>}
              {can("productos:ver")      && <NavLink to="/inventario/productos" className={navClass}>Productos</NavLink>}
              {can("unidades:ver")      && <NavLink to="/catalogo/unidades" className={navClass}>Unidades</NavLink>}
              {can("presentaciones:ver")      && <NavLink to="/catalogo/presentaciones" className={navClass}>Presentaciones</NavLink>}
              {can("clientes:ver")      && <NavLink to="/clientes" className={navClass}>Clientes</NavLink>}
              {can("proveedores:ver")      && <NavLink to="/proveedores" className={navClass}>Proveedores</NavLink>}
              {/* Si API Health debe ser público, deja este sin can() */}

              {/* Seguridad */}
              {(can("usuarios:ver") || can("roles:ver") || can("permisos:ver")) && (
                  <>
                    {can("usuarios:ver") && <NavLink to="/seguridad/usuarios" className={navClass}>Usuarios</NavLink>}
                    {can("roles:ver")    && <NavLink to="/seguridad/roles" className={navClass}>Roles</NavLink>}
                    {can("permisos:ver") && <NavLink to="/seguridad/permisos" className={navClass}>Permisos</NavLink>}
                  </>
              )}
              <NavLink to="/salud" className={navClass}>API Health</NavLink>
            </div>

            {/* Spacer */}
            <div className="ml-auto" />

            {/* Perfil / Salir */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-sm text-neutral-600">
                {user?.nombreCompleto || user?.username || "Usuario"}
              </div>
              <button
                  onClick={() => logout()}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
                  title="Cerrar sesión"
              >
                Salir
              </button>
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

        {/* ====== MODAL: Sesión por expirar ====== */}
        {expiringOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]">
              <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-3 shadow-lg">
                <h3 className="text-lg font-semibold">Tu sesión está por expirar</h3>
                <p className="text-sm text-neutral-700">
                  Para mantenerte conectado, renueva tu sesión ahora. Tiempo restante:{" "}
                  <span className="font-semibold">{countdown}s</span>
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button className="px-3 py-2 rounded border border-neutral-300" onClick={() => setExpiringOpen(false)}>
                    Más tarde
                  </button>
                  <button className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={continuarSesion}>
                    Continuar sesión
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ====== MODAL: Sesión expirada ====== */}
        {expiredOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]">
              <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-3 shadow-lg">
                <h3 className="text-lg font-semibold">Sesión expirada</h3>
                <p className="text-sm text-neutral-700">
                  Tu sesión ha expirado por inactividad. Vuelve a iniciar sesión para continuar.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={irALogin}>
                    Ir a login
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}


