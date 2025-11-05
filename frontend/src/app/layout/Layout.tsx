// src/app/layout/Layout.tsx
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { onAuth } from "@/servicios/httpClient";
import { authService } from "@/servicios/auth";
import { alertasService } from "@/servicios/alertas";            // <<< NUEVO
import type { AlertaItem } from "@/types/alertas";
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

  // Recalcular cuando cambie la ruta (por ancho/activo)
  useEffect(() => {
    updateEdges();
  }, [pathname]);

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

  const canSales = can("ventas:ver");

   // ====== NOTIFICACIONES DE ALERTAS (campana) ======
  const [alertaCount, setAlertaCount] = useState(0);
  const [alertasTop, setAlertasTop] = useState<AlertaItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [toasts, setToasts] = useState<AlertaItem[]>([]);

  // localStorage helpers para hashes
  const HASH_KEY = "alertas.hashes.v1";
  const loadHashes = () => {
    try {
      const raw = localStorage.getItem(HASH_KEY);
      if (!raw) return new Map<number, string>();
      const obj = JSON.parse(raw) as Record<string, string>;
      return new Map<number, string>(Object.entries(obj).map(([k, v]) => [Number(k), String(v)]));
    } catch { return new Map<number, string>(); }
  };
  const saveHashes = (m: Map<number, string>) => {
    const obj: Record<string, string> = {};
    m.forEach((v, k) => { obj[String(k)] = v; });
    localStorage.setItem(HASH_KEY, JSON.stringify(obj));
  };

  // polling cada 60s (solo si el usuario puede ver inventario)
  useEffect(() => {
    let mounted = true;
    if (!can("inventario:ver")) return;

    const run = async () => {
      try {
        const r = await alertasService.resumen({ top: 5 });
        if (!mounted) return;
        setAlertaCount(r.total);
        setAlertasTop(r.top);

        // detectar cambios por estadoHash
        const prev = loadHashes();
        const changed = (r.top ?? []).filter(a => prev.get(a.idAlerta) !== (a.estadoHash ?? ""));
        if (changed.length) {
          setToasts(old => {
            // evita duplicados por el mismo hash
            const keys = new Set(old.map(x => `${x.idAlerta}-${x.estadoHash}`));
            const nuevos = changed.filter(x => !keys.has(`${x.idAlerta}-${x.estadoHash}`));
            return [...old, ...nuevos].slice(-5); // máximo 5 toasts en cola
          });
        }
        r.top.forEach(a => prev.set(a.idAlerta, a.estadoHash ?? ""));
        saveHashes(prev);
      } catch {
        // silencioso; sin alertas no rompemos UI
      }
    };

    run();
    const id = setInterval(run, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, [/* depende de permiso */]);

  // auto-dismiss de toasts (cada 4s saca el primero)
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts(ts => ts.slice(1)), 4000);
    return () => clearTimeout(id);
  }, [toasts]);

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
          {/* <<< NUEVO: CAMPANA DE ALERTAS >>> */}
          {can("inventario:ver") && (
            <div className="relative">
              <button
                onClick={() => setBellOpen(v => !v)}
                className="relative px-2 py-1 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
                title="Alertas de inventario"
                aria-label="Alertas de inventario"
              >
                <span role="img" aria-label="campana">🔔</span>
                {alertaCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-rose-600 text-white rounded-full px-1.5 py-0.5">
                    {Math.min(alertaCount, 99)}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-[380px] bg-white border border-neutral-200 shadow-lg rounded-xl p-3 z-50">
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
                    {alertasTop.map(a => (
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
          {/* <<< FIN CAMPANA >>> */}


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

              {/* Inventario por lote → justo antes de API Health */}
              {can("inventario:ver") && (
                <NavLink to="/inventario/por-lote" className={navClass}>
                  Inventario por lote
                </NavLink>
              )}
              {canSales && (
                <NavLink to="/ventas" className={navClass}>
                  Ventas
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
            {/* TOASTS DE ALERTAS (aparecen cuando cambia estadoHash) */}
      <div className="fixed bottom-4 right-4 space-y-2 z-[60]">
        {toasts.map(a => (
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
