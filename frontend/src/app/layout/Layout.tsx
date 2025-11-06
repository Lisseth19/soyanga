// src/app/layout/Layout.tsx
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { onAuth } from "@/servicios/httpClient";
import { authService } from "@/servicios/auth";
import logo from "@/assets/logo.png";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    // chip
    "inline-flex items-center gap-2 no-underline px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors select-none",
    // color
    isActive
        ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/60"
        : "text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 ring-1 ring-transparent",
  ].join(" ");
}

/* Avatar con iniciales */
function Avatar({ name }: { name?: string }) {
  const initials = useMemo(() => {
    const n = (name || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  return (
      <div className="h-9 w-9 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-semibold shadow-sm">
        {initials}
      </div>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout, can } = useAuth() as {
    user: any | null;
    logout: () => void;
    can: (permiso: string) => boolean;
  };

  // pantallas con layout de módulo (sidebar): full-bleed
  const isSettings =
      pathname.startsWith("/catalogo") ||
      pathname.startsWith("/config") ||
      pathname.startsWith("/compras") ||
      pathname.startsWith("/seguridad") ||
      pathname.startsWith("/ventas");

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
      // convierte scroll vertical del mouse en scroll horizontal del carrusel
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 0.35;
        updateEdges();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, []);

  useEffect(() => {
    updateEdges();
  }, [pathname]);

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

  useEffect(() => {
    if (!expiringOpen) return;
    setCountdown(Math.max(1, Math.round(remainingMs / 1000)));
    const id = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 1)), 1000);
    return () => clearInterval(id);
  }, [expiringOpen, remainingMs]);

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

  /* ================== Permisos por módulo ================== */

  // ===== Seguridad =====
  const canUsuarios = can("usuarios:ver");
  const canRoles = can("roles:ver");
  const canPermisos = can("permisos:ver");
  const canAuditorias = can("auditorias:ver");

  function firstAllowedSecurityRoute(): string | null {
    if (canUsuarios) return "/seguridad/usuarios";
    if (canRoles) return "/seguridad/roles";
    if (canPermisos) return "/seguridad/permisos";
    if (canAuditorias) return "/seguridad/auditorias";
    return null;
  }
  const canSecurity = !!firstAllowedSecurityRoute();
  const securityHref = firstAllowedSecurityRoute() ?? "/seguridad";

  // ===== Configuración & Catálogo =====
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

  // ===== Ventas (si tienes un permiso macro) =====
  const canSales = can("ventas:ver");

  // ===== Compras (sub-permisos) =====
  const canProveedores = can("proveedores:ver");
  const canPedidos = can("pedidos-compra:ver");
  const canRecepciones = can("recepciones-compra:ver");
  function firstAllowedComprasRoute(): string | null {
    if (canProveedores) return "/compras/proveedores";
    if (canPedidos) return "/compras/pedidos";
    if (canRecepciones) return "/compras/recepciones";
    return null;
  }
  const canCompras = !!firstAllowedComprasRoute();

  /* ================== User Menu (dropdown) ================== */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuOpen) return;
      const t = e.target as Node;
      if (menuBtnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
      <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
        {/* HEADER */}
        <header className="sticky top-0 z-40 backdrop-blur bg-white/90 border-b border-neutral-200">
          {/* Línea 1: Brand + User */}
          <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-3">
            <Link to="/inicio" className="flex items-center gap-3 no-underline">
              <img src={logo} alt="Soyanga" className="h-10 w-auto drop-shadow-sm" />
              <div className="leading-tight">
                <div className="text-lg md:text-xl font-extrabold tracking-tight text-emerald-700">
                  SOYANGA
                </div>
                <div className="text-[11px] uppercase tracking-wider text-emerald-700/70">
                  Gestión Comercial
                </div>
              </div>
            </Link>

            <div className="ml-auto" />

            {/* User menu */}
            <div className="relative">
              <button
                  ref={menuBtnRef}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-3 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-neutral-100/80 transition"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
              >
                <Avatar name={user?.nombreCompleto || user?.username} />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-[13px] font-semibold text-neutral-800">
                  {user?.nombreCompleto || user?.username || "Usuario"}
                </span>
                  <span className="text-[11px] text-neutral-500">
                  {user?.correoElectronico || "sesión activa"}
                </span>
                </div>
                <svg width="18" height="18" viewBox="0 0 20 20" className="text-neutral-500">
                  <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>

              {menuOpen && (
                  <div
                      ref={menuRef}
                      role="menu"
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden"
                  >
                    <div className="px-3 py-2 text-xs text-neutral-500">Cuenta</div>
                    <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/inicio");
                        }}
                    >
                      Ir al inicio
                    </button>
                    <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => {
                          setMenuOpen(false);
                          // podrías abrir un modal de perfil aquí
                        }}
                    >
                      Perfil
                    </button>
                    <div className="my-1 h-px bg-neutral-200" />
                    <button
                        className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
              )}
            </div>
          </div>

          {/* Línea 2: NAV (chips con scroll) */}
          <div className="relative border-t border-neutral-200 select-none">
            {/* Flechas */}
            {canScroll && (
                <>
                  <button
                      onClick={() => scrollBy(-260)}
                      disabled={atStart}
                      className={[
                        "hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10",
                        "h-8 w-8 items-center justify-center rounded-full border border-neutral-200 shadow",
                        "bg-white hover:bg-neutral-50 transition",
                        atStart ? "opacity-40 cursor-not-allowed" : "",
                      ].join(" ")}
                      title="Desplazar a la izquierda"
                      aria-label="Desplazar a la izquierda"
                  >
                    <span className="text-neutral-600 text-lg">‹</span>
                  </button>
                  <button
                      onClick={() => scrollBy(260)}
                      disabled={atEnd}
                      className={[
                        "hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10",
                        "h-8 w-8 items-center justify-center rounded-full border border-neutral-200 shadow",
                        "bg-white hover:bg-neutral-50 transition",
                        atEnd ? "opacity-40 cursor-not-allowed" : "",
                      ].join(" ")}
                      title="Desplazar a la derecha"
                      aria-label="Desplazar a la derecha"
                  >
                    <span className="text-neutral-600 text-lg">›</span>
                  </button>
                </>
            )}

            {/* Contenedor scrollable */}
            <div
                ref={navRef}
                onScroll={updateEdges}
                className={[
                  "mx-auto max-w-7xl px-4 py-2.5 overflow-x-auto overflow-y-hidden whitespace-nowrap",
                  "no-scrollbar",
                  dragging ? "cursor-grabbing" : "cursor-grab",
                ].join(" ")}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
            >
              <div className="flex items-center gap-1.5">
                {/* Configuración y Catálogo */}
                {canConfigCatalog && (
                    <NavLink to="/catalogo" className={navClass}>
                      <span>Configuración y Catálogo</span>
                    </NavLink>
                )}

                {/* Compras */}
                {canCompras && (
                    <NavLink
                        to="/compras"
                        className={() => navClass({ isActive: pathname.startsWith("/compras") })}
                    >
                      <span>Compras</span>
                    </NavLink>
                )}

                {/* Ventas */}
                {canSales && (
                    <NavLink to="/ventas" className={navClass}>
                      <span>Ventas</span>
                    </NavLink>
                )}

                {/* Clientes */}
                {can("clientes:ver") && (
                    <NavLink to="/clientes" className={navClass}>
                      <span>Clientes</span>
                    </NavLink>
                )}

                {/* Seguridad */}
                {canSecurity && (
                    <NavLink
                        to={securityHref}
                        className={() => navClass({ isActive: pathname.startsWith("/seguridad") })}
                    >
                      <span>Seguridad</span>
                    </NavLink>
                )}

                {/* Inventario por lote */}
                {can("inventario:ver") && (
                    <NavLink to="/inventario/por-lote" className={navClass}>
                      <span>Inventario por lote</span>
                    </NavLink>
                )}

                {/* API Health (siempre visible) */}
                <NavLink to="/salud" className={navClass}>
                  <span>API Health</span>
                </NavLink>
              </div>
            </div>

            {/* Fades laterales */}
            {canScroll && !atStart && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
            )}
            {canScroll && !atEnd && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
            )}
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 overflow-x-hidden">
          <div className={`${isSettings ? "max-w-none px-0" : "mx-auto max-w-7xl px-4"} py-6`}>
            <Outlet />
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-neutral-200 bg-white">
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
