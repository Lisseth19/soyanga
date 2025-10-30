// src/app/layout/Layout.tsx
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { onAuth } from "@/servicios/httpClient";
import { authService } from "@/servicios/auth";
import logo from "@/assets/logo.png";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex items-center no-underline px-3 py-2 mx-1 rounded-lg text-sm font-medium transition-colors select-none",
    isActive ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50",
  ].join(" ");
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout, can } = useAuth() as {
    user: any | null;
    logout: () => void;
    can: (permiso: string) => boolean;
  };

  // 👉 pantallas con layout de módulo (sidebar): full-bleed
  const isSettings =
    pathname.startsWith("/catalogo") ||
    pathname.startsWith("/config") ||
    pathname.startsWith("/compras") ||
    pathname.startsWith("/seguridad") ||
    pathname.startsWith("/inventario");

  /* ================== Scroll del menú superior ================== */
  const navRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; scrollLeft: number }>({ startX: 0, scrollLeft: 0 });

  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = navRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScroll(max > 4);
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  };

  const scrollBy = (dx: number) => {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: "smooth" });
    setTimeout(updateEdges, 180);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 0.35;
        updateEdges();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, []);

  // Drag-to-scroll
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = navRef.current;
    if (!el) return;
    setDragging(true);
    dragState.current.startX = e.pageX - el.getBoundingClientRect().left;
    dragState.current.scrollLeft = el.scrollLeft;
  };
  const onMouseLeave: React.MouseEventHandler<HTMLDivElement> = () => setDragging(false);
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => setDragging(false);
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragging) return;
    const el = navRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.getBoundingClientRect().left;
    const walk = (x - dragState.current.startX) * 0.6;
    el.scrollLeft = dragState.current.scrollLeft - walk;
    updateEdges();
  };

  useEffect(() => {
    updateEdges();
    const obs = new ResizeObserver(updateEdges);
    if (navRef.current) obs.observe(navRef.current);
    return () => obs.disconnect();
  }, []);

  /* ================== Modales de sesión ================== */
  const [expiringOpen, setExpiringOpen] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);

  // cuenta atrás visible
  useEffect(() => {
    if (!expiringOpen) return;
    setCountdown(Math.max(1, Math.round(remainingMs / 1000)));
    const id = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 1)), 1000);
    return () => clearInterval(id);
  }, [expiringOpen, remainingMs]);

  // eventos emitidos por httpClient (onAuth)
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
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  async function continuarSesion() {
    try {
      const ok = await authService.refresh();
      if (ok) {
        setExpiringOpen(false);
        return;
      }
      setExpiringOpen(false);
      setExpiredOpen(true);
    } catch {
      setExpiringOpen(false);
      setExpiredOpen(true);
    }
  }
  function irALogin() {
    logout();
    navigate("/soyanga/login");
  }

  // Permisos por módulo
  const canConfigCatalog =
    can("sucursales:ver") ||
    can("almacenes:ver") ||
    can("monedas:ver") ||
    can("tipos-cambio:ver") ||
    can("categorias:ver") ||
    can("productos:ver") ||
    can("unidades:ver") ||
    can("presentaciones:ver") ||
    can("codigos-barras:ver");

  const canSecurity =
    can("usuarios:ver") || can("roles:ver") || can("permisos:ver") || can("auditorias:ver");

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        {/* Línea 1: brand + perfil */}
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          <Link to="/inicio" className="flex items-center gap-2 no-underline">
            <img src={logo} alt="Soyanga" className="h-8 w-auto" />
            <span className="text-emerald-700 font-semibold tracking-wide">SOYANGA</span>
          </Link>

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
        </div>

        {/* Línea 2: NAV con scroll horizontal (rueda / drag / flechas) */}
        <div className="relative border-t border-neutral-200 select-none">
          {/* Flechas */}
          {canScroll && (
            <>
              <button
                onClick={() => scrollBy(-260)}
                disabled={atStart}
                className={[
                  "hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10",
                  "h-8 w-8 items-center justify-center rounded-full border border-neutral-200 shadow",
                  "bg-white hover:bg-neutral-50 transition",
                  atStart ? "opacity-40 cursor-not-allowed" : "",
                ].join(" ")}
                title="Desplazar a la izquierda"
                aria-label="Desplazar a la izquierda"
              >
                ‹
              </button>
              <button
                onClick={() => scrollBy(260)}
                disabled={atEnd}
                className={[
                  "hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10",
                  "h-8 w-8 items-center justify-center rounded-full border border-neutral-200 shadow",
                  "bg-white hover:bg-neutral-50 transition",
                  atEnd ? "opacity-40 cursor-not-allowed" : "",
                ].join(" ")}
                title="Desplazar a la derecha"
                aria-label="Desplazar a la derecha"
              >
                ›
              </button>
            </>
          )}

          {/* Contenedor scrollable */}
          <div
            ref={navRef}
            onScroll={updateEdges}
            className={[
              "mx-auto max-w-7xl px-10 py-2 overflow-x-auto overflow-y-hidden whitespace-nowrap",
              "no-scrollbar",
              dragging ? "cursor-grabbing" : "cursor-grab",
            ].join(" ")}
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
          >
            {/* Nav principal (con permisos) */}
            <div className="flex items-center gap-1">
              {can("inventario:ver") && (
                <NavLink to="/inventario/por-lote" className={navClass}>
                  Inventario por lote
                </NavLink>
              )}

              {can("ajustes:ver") && (
                <NavLink to="/inventario/ajustes" className={navClass}>
                  Ajustes de inventario
                </NavLink>
              )}

              {canConfigCatalog && (
                <NavLink to="/catalogo" className={navClass}>
                  Configuración y Catálogo
                </NavLink>
              )}

              {can("compras:ver") && (
                <NavLink to="/compras" className={navClass}>
                  Compras
                </NavLink>
              )}

              {can("clientes:ver") && (
                <NavLink to="/clientes" className={navClass}>
                  Clientes
                </NavLink>
              )}

              {canSecurity && (
                <NavLink to="/seguridad" className={navClass}>
                  Seguridad
                </NavLink>
              )}
              <NavLink to="/salud" className={navClass}>
                API Health
              </NavLink>
            </div>
          </div>

          {/* Fades laterales */}
          {canScroll && !atStart && (
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
          )}
          {canScroll && !atEnd && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
          )}
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1">
        <div className={`${isSettings ? "max-w-none px-0" : "mx-auto max-w-7xl px-4"} py-6`}>
          <Outlet />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-neutral-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Soyanga</span>
          <span className="hidden sm:inline">Build: Frontend (Vite + React + TS)</span>
        </div>
      </footer>

      {/* MODAL: Sesión por expirar */}
      {expiringOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-3 shadow-lg">
            <h3 className="text-lg font-semibold">Tu sesión está por expirar</h3>
            <p className="text-sm text-neutral-700">
              Para mantenerte conectado, renueva tu sesión ahora. Tiempo restante:{" "}
              <span className="font-semibold">{countdown}s</span>
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                className="px-3 py-2 rounded border border-neutral-300"
                onClick={() => setExpiringOpen(false)}
              >
                Más tarde
              </button>
              <button
                className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={continuarSesion}
              >
                Continuar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Sesión expirada */}
      {expiredOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-3 shadow-lg">
            <h3 className="text-lg font-semibold">Sesión expirada</h3>
            <p className="text-sm text-neutral-700">
              Tu sesión ha expirado por inactividad. Vuelve a iniciar sesión para continuar.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={irALogin}
              >
                Ir a login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
