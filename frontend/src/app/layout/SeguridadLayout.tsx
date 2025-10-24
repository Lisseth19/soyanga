// src/app/layout/SeguridadLayout.tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,   // título módulo
  Users,          // usuarios
  UserCog,        // roles
  KeyRound,       // permisos
  History,        // auditorías
  ChevronDown
} from "lucide-react";

function itemClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
    isActive
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "text-neutral-700 hover:bg-neutral-50",
  ].join(" ");
}

export default function SeguridadLayout() {
  const { can } = useAuth() as { can: (permiso: string) => boolean };
  const { pathname } = useLocation();

  // abrir por defecto si estoy dentro
  const startsSeg = useMemo(() => pathname.startsWith("/seguridad"), [pathname]);
  const [openGest, setOpenGest] = useState<boolean>(startsSeg || true);

  const canUsuarios   = can("usuarios:ver");
  const canRoles      = can("roles:ver");
  const canPermisos   = can("permisos:ver");
  const canAuditorias = can("auditorias:ver"); // si aún no hay permisos, puedes devolver true temporalmente

  return (
    <div className="px-0 py-6">
      <div className="grid grid-cols-12 gap-6 pr-6">
        {/* SIDEBAR */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
              <ShieldCheck size={18} /> Seguridad
            </div>

            {/* ====== GESTIÓN ====== */}
            <button
              type="button"
              onClick={() => setOpenGest(v => !v)}
              className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
              aria-expanded={openGest}
            >
              <span>Gestión</span>
              <ChevronDown size={16} className={`transition-transform ${openGest ? "rotate-180" : ""}`} />
            </button>

            <nav className={`flex flex-col gap-1 ${openGest ? "" : "hidden"}`}>
              {canUsuarios && (
                <NavLink to="/seguridad/usuarios" className={itemClass}>
                  <Users size={16} /> Usuarios
                </NavLink>
              )}
              {canRoles && (
                <NavLink to="/seguridad/roles" className={itemClass}>
                  <UserCog size={16} /> Roles
                </NavLink>
              )}
              {canPermisos && (
                <NavLink to="/seguridad/permisos" className={itemClass}>
                  <KeyRound size={16} /> Permisos
                </NavLink>
              )}
              {/* Si aún no tienes backend para auditorías, deja esta ruta visible igual */}
              <NavLink to="/seguridad/auditorias" className={itemClass}>
                <History size={16} /> Auditorías
              </NavLink>
            </nav>
          </div>
        </aside>

        {/* CONTENT */}
        <section className="col-span-12 md:col-span-9 lg:col-span-9">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
