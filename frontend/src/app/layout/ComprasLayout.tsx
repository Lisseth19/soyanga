// src/app/layout/ComprasLayout.tsx
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShoppingBag,
  Users2,
  ClipboardList,
  PackageCheck,
  ChevronDown,
} from "lucide-react";
import { GlobalAccessDeniedModal } from "@/componentes/GlobalAccessDeniedModal";

function itemClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
    isActive
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : "text-neutral-700 hover:bg-neutral-50",
  ].join(" ");
}

type RouteDef = {
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  allowed: boolean;
  // opcional: prioridad; si no se define, el orden en el array es la prioridad
};

export default function ComprasLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can } = useAuth();

  // Permisos
  const canProveedores = can("proveedores:ver");
  const canPedidos     = can("pedidos-compra:ver");
  const canRecepciones = can("recepciones-compra:ver");

  // Matriz única de rutas del módulo (Single Source of Truth)
  const routes: RouteDef[] = useMemo(
      () => [
        { path: "/compras/proveedores", label: "Proveedores",       Icon: Users2,        allowed: canProveedores },
        { path: "/compras/pedidos",     label: "Pedidos de compra", Icon: ClipboardList, allowed: canPedidos },
        { path: "/compras/recepciones", label: "Recepciones",       Icon: PackageCheck,  allowed: canRecepciones },
      ],
      [canProveedores, canPedidos, canRecepciones]
  );

  const hasAnyPermission = routes.some(r => r.allowed);

  // Acordeón: abierto si estoy en /compras/*
  const startsCompras = useMemo(() => pathname.startsWith("/compras"), [pathname]);
  const [openCompras, setOpenCompras] = useState<boolean>(startsCompras);
  useEffect(() => { setOpenCompras(startsCompras); }, [startsCompras]);

  // Helpers derivados del array
  const firstAllowedRoute = useMemo(
      () => routes.find(r => r.allowed)?.path ?? null,
      [routes]
  );

  const isAllowedPath = useCallback(
      (p: string) => {
        if (p === "/compras" || p === "/compras/") return true; // root
        // Si p inicia con el path de una ruta y esa ruta está permitida -> ok
        return routes.some(r => p.startsWith(r.path) && r.allowed);
      },
      [routes]
  );

  // Redirección inteligente
  useEffect(() => {
    if (!pathname.startsWith("/compras")) return;

    // Sin permisos para nada de compras -> fuera
    if (!hasAnyPermission || !firstAllowedRoute) {
      navigate("/inicio", { replace: true });
      return;
    }

    // En root del módulo -> a la primera permitida
    if (pathname === "/compras" || pathname === "/compras/") {
      navigate(firstAllowedRoute, { replace: true });
      return;
    }

    // En subruta no permitida -> a la primera permitida
    if (!isAllowedPath(pathname)) {
      navigate(firstAllowedRoute, { replace: true });
      return;
    }
  }, [pathname, hasAnyPermission, firstAllowedRoute, isAllowedPath, navigate]);

  // Evitar montar el Outlet de pantallas sin permiso
  const safeToRenderOutlet =
      pathname === "/compras" ||
      pathname === "/compras/" ||
      isAllowedPath(pathname);

  function SidebarCard() {
    return (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
            <ShoppingBag size={18} /> Compras
          </div>

          {hasAnyPermission && (
              <>
                <button
                    type="button"
                    onClick={() => setOpenCompras(v => !v)}
                    className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                    aria-expanded={openCompras}
                    aria-controls="compras-gestion-nav"
                >
                  <span>Gestión</span>
                  <ChevronDown
                      size={16}
                      className={`transition-transform ${openCompras ? "rotate-180" : ""}`}
                  />
                </button>

                <nav
                    id="compras-gestion-nav"
                    className={`flex flex-col gap-1 ${openCompras ? "" : "hidden"}`}
                >
                  {routes
                      .filter(r => r.allowed)
                      .map(({ path, label, Icon }) => (
                          <NavLink key={path} to={path} className={itemClass}>
                            <Icon size={16} /> {label}
                          </NavLink>
                      ))}
                </nav>
              </>
          )}
        </div>
    );
  }

  return (
      <>
        <div className="min-h-screen overflow-x-hidden px-0 py-6">
          {/* MOBILE (< md): sidebar normal arriba */}
          <div className="md:hidden px-4 pb-4">
            <SidebarCard />
          </div>

          {/* DESKTOP (md+): sidebar fijo */}
          <aside
              className="
            hidden
            md:block
            md:fixed
            md:left-0
            md:top-[7rem]
            md:w-64
            lg:w-72
            md:h-[calc(100vh-7rem)]
            md:overflow-y-auto
            md:px-4
            md:pb-6
            md:pt-4
            flex-shrink-0
            bg-transparent
          "
          >
            <SidebarCard />
          </aside>

          {/* CONTENIDO DERECHO */}
          <section
              className="
            mt-6 md:mt-0
            px-4 md:px-6 lg:px-8
            md:ml-64 lg:ml-72
            flex-1
            min-w-0
            overflow-x-auto
          "
          >
            {safeToRenderOutlet ? <Outlet /> : <div />}
          </section>
        </div>

        <GlobalAccessDeniedModal />
      </>
  );
}
