// src/app/layout/Layout.tsx
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { onAuth } from "@/servicios/httpClient";
import { authService } from "@/servicios/auth";
import { alertasService } from "@/servicios/alertas"; // ALERTAS
import type { AlertaItem } from "@/types/alertas";
import logo from "@/assets/logo.png";

/* Chip class del nav */
function navClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex items-center gap-2 no-underline px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors select-none",
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

  /* ===== Rutas con layout de módulo (sidebar) ===== */
  const isSettings =
    pathname.startsWith("/catalogo") ||
    pathname.startsWith("/config") ||
    pathname.startsWith("/compras") ||
    pathname.startsWith("/seguridad") ||
    pathname.startsWith("/inventario") ||
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
  // Seguridad finos
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

  // Configuración & Catálogo
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

  // Ventas
  const canSales = can("ventas:ver");

  // Compras por sub-permisos
  const canProveedores = can("proveedores:ver");
  const canPedidos = can("pedidos-compra:ver") || can("compras:ver"); // compatibilidad macro
  const canRecepciones = can("recepciones-compra:ver");
  function firstAllowedComprasRoute(): string | null {
    if (canProveedores) return "/compras/proveedores";
    if (canPedidos) return "/compras/pedidos";
    if (canRecepciones) return "/compras/recepciones"; // por si añades la pantalla después
    return null;
  }
  const canCompras = !!firstAllowedComprasRoute();
  const canInventario = can("inventario:ver");

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

  /* ================== ALERTAS (campana + polling + toasts) ================== */
  const [alertaCount, setAlertaCount] = useState(0);
  const [alertasTop, setAlertasTop] = useState<AlertaItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [toasts, setToasts] = useState<AlertaItem[]>([]);

  const HASH_KEY = "alertas.hashes.v1";
  const loadHashes = () => {
    try {
      const raw = localStorage.getItem(HASH_KEY);
      if (!raw) return new Map<number, string>();
      const obj = JSON.parse(raw) as Record<string, string>;
      return new Map<number, string>(Object.entries(obj).map(([k, v]) => [Number(k), String(v)]));
    } catch {
      return new Map<number, string>();
    }
  };
  const saveHashes = (m: Map<number, string>) => {
    const obj: Record<string, string> = {};
    m.forEach((v, k) => {
      obj[String(k)] = v;
    });
    localStorage.setItem(HASH_KEY, JSON.stringify(obj));
  };

  useEffect(() => {
    let mounted = true;
    if (!canInventario) return;

    const run = async () => {
      try {
        const r = await alertasService.resumen({ top: 5 });
        if (!mounted) return;
        setAlertaCount(r.total);
        setAlertasTop(r.top);

        // toasts por cambios de estadoHash
        const prev = loadHashes();
        const changed = (r.top ?? []).filter((a) => prev.get(a.idAlerta) !== (a.estadoHash ?? ""));
        if (changed.length) {
          setToasts((old) => {
            const keys = new Set(old.map((x) => `${x.idAlerta}-${x.estadoHash}`));
            const nuevos = changed.filter((x) => !keys.has(`${x.idAlerta}-${x.estadoHash}`));
            return [...old, ...nuevos].slice(-5);
          });
        }
        r.top.forEach((a) => prev.set(a.idAlerta, a.estadoHash ?? ""));
        saveHashes(prev);
      } catch {
        // silencioso
      }
    };

    run();
    const id = setInterval(run, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [canInventario]);

  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((ts) => ts.slice(1)), 4000);
    return () => clearTimeout(id);
  }, [toasts]);

  /* ================== RENDER ================== */
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        {/* Línea 1: brand + user + campana */}
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

          {/* Campana de alertas (si ve inventario) */}
          {canInventario && (
            <div className="relative mr-1">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative px-2 py-1 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
                title="Alertas de inventario"
                aria-label="Alertas de inventario"
              >
                <span role="img" aria-label="campana">
                  🔔
                </span>
                {alertaCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-rose-600 text-white rounded-full px-1.5 py-0.5">
                    {Math.min(alertaCount, 99)}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div
                  className="absolute right-0 mt-2 w-[380px] bg-white border border-neutral-200 shadow-lg rounded-xl p-3 z-50"
                  onMouseLeave={() => setBellOpen(false)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Alertas (Top)</div>
                    <div className="text-xs text-neutral-500">
                      Total: <strong>{alertaCount}</strong>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-auto">
                    {alertasTop.length === 0 && (
                      <div className="text-sm text-neutral-500">Sin alertas.</div>
                    )}
                    {alertasTop.map((a) => (
                      <div
                        key={`${a.idAlerta}-${a.idLote}-${a.idAlmacen}`}
                        className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {a.producto} <span className="text-neutral-500">({a.sku})</span>
                          </div>
                          <div className="text-xs text-neutral-500 truncate">
                            Lote {a.numeroLote} • {a.almacen}
                          </div>
                          <div className="text-xs text-neutral-600 mt-0.5">
                            {a.diasRestantes == null
                              ? "Sin vencimiento"
                              : a.diasRestantes < 0
                              ? `Vencido hace ${Math.abs(a.diasRestantes)} d`
                              : a.diasRestantes === 0
                              ? "Vence hoy"
                              : `En ${a.diasRestantes} d`}
                          </div>
                        </div>
                        <div className="text-right shrink-0 text-xs">
                          <div className="inline-flex items-center rounded-full px-2 py-0.5 border border-neutral-200">
                            {a.tipo.replaceAll("_", " ")}
                          </div>
                          <div className="mt-1 text-neutral-600">{a.severidad}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-right">
                    <NavLink to="/inventario/por-lote" className="text-sm text-emerald-700 hover:underline">
                      Ver inventario por lote »
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Menú de usuario */}
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
                    // aquí podrías abrir un modal de perfil
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

              {/* Compras (usa sub-permisos para decidir visible) */}
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
              {canInventario && (
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

      {/* TOASTS DE ALERTAS */}
      <div className="fixed bottom-4 right-4 space-y-2 z-[60]">
        {toasts.map((a) => (
          <div
            key={`toast-${a.idAlerta}-${a.estadoHash ?? ""}`}
            className="bg-white border border-neutral-200 shadow-lg rounded-xl p-3 w-80"
          >
            <div className="text-sm font-semibold">{a.producto}</div>
            <div className="text-xs text-neutral-600">
              {a.tipo.replaceAll("_", " ")} • {a.severidad}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Lote {a.numeroLote} • {a.almacen}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
