// src/app/layout/SettingsLayout.tsx
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";

// permisos / sesión
import { useAuth } from "@/context/AuthContext";

// modal global de acceso denegado (403)
import { GlobalAccessDeniedModal } from "@/componentes/GlobalAccessDeniedModal";

// Icons
import {
  FolderCog,
  Warehouse,
  Building2,
  DollarSign,
  Coins,
  Layers3,
  Package,
  Ruler,
  Tags,
  Barcode,
  ChevronDown,
} from "lucide-react";

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
  section: "estructura" | "finanzas" | "catalogo";
};

export default function SettingsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can } = useAuth();

  // ¿estoy en /catalogo/* o en /config/*?
  const isCatalogo = pathname.startsWith("/catalogo");

  /* =========================
     PERMISOS
     ========================= */
  // Estructura
  const canSucursales = can("sucursales:ver");
  const canAlmacenes  = can("almacenes:ver");

  // Finanzas
  const canMonedas      = can("monedas:ver");
  const canTiposCambio  = can("tipos-cambio:ver");

  // Catálogo (granular)
  const canCategorias       = can("categorias:ver");
  const canProductos        = can("productos:ver");
  const canUnidades         = can("unidades:ver");
  const canPresentaciones   = can("presentaciones:ver");
  const canCodigosBarras    = can("codigos-barras:ver");

  // ¿Existe landing de catálogo? (si quieres que SIEMPRE haya inicio al tener cualquier permiso, lo activamos)
  const hasAnyCatalogPerm =
      canCategorias || canProductos || canUnidades || canPresentaciones || canCodigosBarras;

  // Si deseas que el "Inicio del Catálogo" exista siempre que haya cualquier permiso, lo marcamos allowed.
  const hasCatalogoInicio = hasAnyCatalogPerm; // cámbialo a `can("catalogo:ver")` si más adelante lo separas

  const hasAnyConfigPerm =
      canSucursales || canAlmacenes || canMonedas || canTiposCambio;

  /* =========================
     RUTAS (SSoT)
     ========================= */
  const routes: RouteDef[] = useMemo(() => {
    const arr: RouteDef[] = [
      // CONFIG → ESTRUCTURA
      { path: "/config/estructura/sucursales", label: "Sucursales", Icon: Building2, allowed: canSucursales, section: "estructura" },
      { path: "/config/estructura/almacenes",  label: "Almacenes",  Icon: Warehouse,  allowed: canAlmacenes,  section: "estructura" },

      // CONFIG → FINANZAS
      { path: "/config/finanzas/monedas",      label: "Monedas",        Icon: DollarSign, allowed: canMonedas,     section: "finanzas" },
      { path: "/config/finanzas/tipos-cambio", label: "Tipos de Cambio", Icon: Coins,      allowed: canTiposCambio, section: "finanzas" },

      // CATÁLOGO (incluye landing si aplica)
      { path: "/catalogo",                     label: "Inicio del Catálogo", Icon: Layers3,     allowed: hasCatalogoInicio, section: "catalogo" },
      { path: "/catalogo/categorias",          label: "Categorías",          Icon: Tags,        allowed: canCategorias,     section: "catalogo" },
      { path: "/catalogo/productos",           label: "Productos",           Icon: Package,     allowed: canProductos,      section: "catalogo" },
      { path: "/catalogo/unidades",            label: "Unidades de medida",  Icon: Ruler,       allowed: canUnidades,       section: "catalogo" },
      { path: "/catalogo/presentaciones",      label: "Presentaciones",      Icon: Layers3,     allowed: canPresentaciones, section: "catalogo" },
      { path: "/catalogo/codigos-barras",      label: "Códigos de barras",   Icon: Barcode,     allowed: canCodigosBarras,  section: "catalogo" },
    ];
    return arr;
  }, [
    canSucursales, canAlmacenes,
    canMonedas, canTiposCambio,
    canCategorias, canProductos, canUnidades, canPresentaciones, canCodigosBarras,
    hasCatalogoInicio,
  ]);

  /* =========================
     ACORDEONES (sin || true) + sincronizados
     ========================= */
  const startsEstructura = useMemo(() => pathname.startsWith("/config/estructura"), [pathname]);
  const startsFinanzas   = useMemo(() => pathname.startsWith("/config/finanzas"),   [pathname]);
  const startsCatalogo   = useMemo(() => pathname.startsWith("/catalogo"),          [pathname]);

  const [openEstructura, setOpenEstructura] = useState<boolean>(startsEstructura || (!startsFinanzas && !startsCatalogo));
  const [openFinanzas,   setOpenFinanzas]   = useState<boolean>(startsFinanzas);
  const [openCatalogo,   setOpenCatalogo]   = useState<boolean>(startsCatalogo);

  useEffect(() => { setOpenEstructura(startsEstructura || (!startsFinanzas && !startsCatalogo)); }, [startsEstructura, startsFinanzas, startsCatalogo]);
  useEffect(() => { setOpenFinanzas(startsFinanzas); }, [startsFinanzas]);
  useEffect(() => { setOpenCatalogo(startsCatalogo); }, [startsCatalogo]);

  /* =========================
     HELPERS DERIVADOS (por módulo)
     ========================= */
  const configRoutes   = useMemo(() => routes.filter(r => r.section !== "catalogo"), [routes]);
  const catalogoRoutes = useMemo(() => routes.filter(r => r.section === "catalogo"), [routes]);

  const firstAllowedConfig = useMemo(
      () => configRoutes.find(r => r.allowed)?.path ?? null,
      [configRoutes]
  );

  const firstAllowedCatalog = useMemo(
      () => catalogoRoutes.find(r => r.allowed)?.path ?? null,
      [catalogoRoutes]
  );

  const isAllowedPath = useCallback(
      (p: string): boolean => {
        // Permitir roots (se resuelven con redirect abajo)
        if (p === "/config" || p === "/config/")   return true;
        if (p === "/catalogo" || p === "/catalogo/") return true;

        // Cualquier subruta debe coincidir con una ruta conocida y permitida
        return routes.some(r => p.startsWith(r.path) && r.allowed);
      },
      [routes]
  );

  /* =========================
     REDIRECCIONES INTELIGENTES
     ========================= */
  useEffect(() => {
    // /config... logic
    if (pathname.startsWith("/config")) {
      // si no tiene ninguna pantalla de config -> fuera
      if (!hasAnyConfigPerm || !firstAllowedConfig) {
        navigate("/inicio", { replace: true });
        return;
      }

      // root /config -> ir al primer permitido
      if (pathname === "/config" || pathname === "/config/") {
        navigate(firstAllowedConfig, { replace: true });
        return;
      }

      // subruta no permitida -> redirigir a la primera permitida
      if (!isAllowedPath(pathname)) {
        navigate(firstAllowedConfig, { replace: true });
        return;
      }
    }

    // /catalogo... logic
    if (pathname.startsWith("/catalogo")) {
      // si no tiene ninguna pantalla de catálogo -> fuera
      if (!hasAnyCatalogPerm || !firstAllowedCatalog) {
        navigate("/inicio", { replace: true });
        return;
      }

      // root /catalogo:
      // - si el "Inicio del Catálogo" está permitido (firstAllowedCatalog === "/catalogo"), te quedas,
      // - si no existe landing, redirige a la primera subruta permitida.
      if (pathname === "/catalogo" || pathname === "/catalogo/") {
        if (firstAllowedCatalog !== "/catalogo") {
          navigate(firstAllowedCatalog, { replace: true });
        }
        return;
      }

      // subruta no permitida -> redirigir a la primera permitida
      if (!isAllowedPath(pathname)) {
        navigate(firstAllowedCatalog, { replace: true });
        return;
      }
    }
  }, [
    pathname,
    navigate,
    isAllowedPath,
    hasAnyConfigPerm,
    hasAnyCatalogPerm,
    firstAllowedConfig,
    firstAllowedCatalog,
  ]);

  /* =========================
     CONTROL DE RENDER DEL OUTLET
     ========================= */
  const safeToRenderOutlet =
      isAllowedPath(pathname) ||
      pathname === "/config" ||
      pathname === "/config/" ||
      pathname === "/catalogo" ||
      pathname === "/catalogo/";

  /* =========================
     Sidebar reusable content
     ========================= */
  function SidebarCard() {
    // Helpers por sección (para mostrar u ocultar acordeones)
    const hasEstructura = configRoutes.some(r => r.section === "estructura" && r.allowed);
    const hasFinanzas   = configRoutes.some(r => r.section === "finanzas"   && r.allowed);
    const hasCatalogo   = catalogoRoutes.some(r => r.allowed);

    return (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
            <FolderCog size={18} />
            {isCatalogo ? "Catálogo" : "Configuración"}
          </div>

          {/* ====== ESTRUCTURA ====== */}
          {hasEstructura && (
              <>
                <button
                    type="button"
                    onClick={() => setOpenEstructura(v => !v)}
                    className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                    aria-expanded={openEstructura}
                    aria-controls="settings-estructura-nav"
                >
                  <span>ESTRUCTURA</span>
                  <ChevronDown
                      size={16}
                      className={`transition-transform ${openEstructura ? "rotate-180" : ""}`}
                  />
                </button>

                <nav
                    id="settings-estructura-nav"
                    className={`flex flex-col gap-1 mb-3 ${openEstructura ? "" : "hidden"}`}
                >
                  {configRoutes
                      .filter(r => r.section === "estructura" && r.allowed)
                      .map(({ path, label, Icon }) => (
                          <NavLink key={path} to={path} className={itemClass}>
                            <Icon size={16} /> {label}
                          </NavLink>
                      ))}
                </nav>
              </>
          )}

          {/* ====== FINANZAS ====== */}
          {hasFinanzas && (
              <>
                <button
                    type="button"
                    onClick={() => setOpenFinanzas(v => !v)}
                    className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                    aria-expanded={openFinanzas}
                    aria-controls="settings-finanzas-nav"
                >
                  <span>FINANZAS</span>
                  <ChevronDown
                      size={16}
                      className={`transition-transform ${openFinanzas ? "rotate-180" : ""}`}
                  />
                </button>

                <nav
                    id="settings-finanzas-nav"
                    className={`flex flex-col gap-1 mb-3 ${openFinanzas ? "" : "hidden"}`}
                >
                  {configRoutes
                      .filter(r => r.section === "finanzas" && r.allowed)
                      .map(({ path, label, Icon }) => (
                          <NavLink key={path} to={path} className={itemClass}>
                            <Icon size={16} /> {label}
                          </NavLink>
                      ))}
                </nav>
              </>
          )}

          {/* ====== CATÁLOGO ====== */}
          {hasCatalogo && (
              <>
                <button
                    type="button"
                    onClick={() => setOpenCatalogo(v => !v)}
                    className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                    aria-expanded={openCatalogo}
                    aria-controls="settings-catalogo-nav"
                >
                  <span>CATÁLOGO</span>
                  <ChevronDown
                      size={16}
                      className={`transition-transform ${openCatalogo ? "rotate-180" : ""}`}
                  />
                </button>

                <nav
                    id="settings-catalogo-nav"
                    className={`flex flex-col gap-1 ${openCatalogo ? "" : "hidden"}`}
                >
                  {catalogoRoutes
                      .filter(r => r.allowed)
                      .map(({ path, label, Icon }) => (
                          <NavLink
                              key={path}
                              to={path}
                              end={path === "/catalogo"} // evita activo en subrutas
                              className={itemClass}
                          >
                            <Icon size={16} /> {label}
                          </NavLink>
                      ))}
                </nav>
              </>
          )}
        </div>
    );
  }

  /* =========================
     RENDER FINAL
     ========================= */
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
              <NavLink to="/config/finanzas/historial-precios" className={itemClass}>
                <Coins size={16}/> Historial de precios
              </NavLink>
              <NavLink to="/config/finanzas/reglas-precios" className={itemClass}>
                <Coins size={16}/> Reglas de Precios
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

      <>
        <div className="min-h-screen overflow-x-hidden px-0 py-6">
          {/* MOBILE (< md): sidebar normal arriba */}
          <div className="md:hidden px-4 pb-4">
            <SidebarCard />

          </div>

          {/* DESKTOP (md+): sidebar fijo como poste */}
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

        {/* Modal global Acceso Denegado */}
        <GlobalAccessDeniedModal />
      </>
  );
}
