// src/app/layout/SeguridadLayout.tsx
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
import { useAuth } from "@/context/AuthContext";
import {
    ShieldCheck,
    Users,
    UserCog,
    KeyRound,
    History,
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
};

export default function SeguridadLayout() {
    // Si tu AuthContext expone loadingPerms, puedes usarlo para evitar flicker:
    // const { can, loadingPerms } = useAuth();
    const { can } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    /* =========================
       PERMISOS Y RUTAS (SSoT)
       ========================= */
    const canUsuarios   = can("usuarios:ver");
    const canRoles      = can("roles:ver");
    const canPermisos   = can("permisos:ver");
    const canAuditorias = can("auditorias:ver");

    const routes: RouteDef[] = useMemo(
        () => [
            { path: "/seguridad/usuarios",   label: "Usuarios",   Icon: Users,    allowed: canUsuarios },
            { path: "/seguridad/roles",      label: "Roles",      Icon: UserCog,  allowed: canRoles },
            { path: "/seguridad/permisos",   label: "Permisos",   Icon: KeyRound, allowed: canPermisos },
            { path: "/seguridad/auditorias", label: "Auditorías", Icon: History,  allowed: canAuditorias },
        ],
        [canUsuarios, canRoles, canPermisos, canAuditorias]
    );

    const hasAnyPermission = routes.some(r => r.allowed);

    /* =========================
       ACORDEÓN: ABIERTO SI ESTOY EN /seguridad/*
       ========================= */
    const startsSeg = useMemo(
        () => pathname.startsWith("/seguridad"),
        [pathname]
    );
    const [openGest, setOpenGest] = useState<boolean>(startsSeg);
    useEffect(() => { setOpenGest(startsSeg); }, [startsSeg]);

    /* =========================
       HELPERS DERIVADOS
       ========================= */
    const firstAllowedRoute = useMemo(
        () => routes.find(r => r.allowed)?.path ?? null,
        [routes]
    );

    const isAllowedPath = useCallback(
        (p: string): boolean => {
            if (p === "/seguridad" || p === "/seguridad/") return true; // root
            return routes.some(r => p.startsWith(r.path) && r.allowed);
        },
        [routes]
    );

    /* =========================
       REDIRECCIÓN INTELIGENTE
       =========================
       - /seguridad → a la primera subruta permitida (según orden del array).
       - Subruta sin permiso → a la primera permitida.
       - Sin permisos → /inicio.
    */
    useEffect(() => {
        // if (loadingPerms) return; // <- si tienes estado de carga de permisos

        if (!pathname.startsWith("/seguridad")) return;

        if (!hasAnyPermission || !firstAllowedRoute) {
            navigate("/inicio", { replace: true });
            return;
        }

        if (pathname === "/seguridad" || pathname === "/seguridad/") {
            navigate(firstAllowedRoute, { replace: true });
            return;
        }

        if (!isAllowedPath(pathname)) {
            navigate(firstAllowedRoute, { replace: true });
            return;
        }
    }, [pathname, hasAnyPermission, firstAllowedRoute, isAllowedPath, navigate /*, loadingPerms*/]);

    /* =========================
       CONTROL DE RENDER DEL OUTLET
       ========================= */
    const safeToRenderOutlet =
        pathname === "/seguridad" ||
        pathname === "/seguridad/" ||
        isAllowedPath(pathname);

    /* =========================
       SIDEBAR
       ========================= */
    function SidebarContent() {
        return (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
                    <ShieldCheck size={18} /> Seguridad
                </div>

                {hasAnyPermission && (
                    <>
                        <button
                            type="button"
                            onClick={() => setOpenGest(v => !v)}
                            className="w-full text-left text-xs font-semibold text-neutral-500 uppercase mb-1 px-1 py-1 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                            aria-expanded={openGest}
                            aria-controls="seguridad-gestion-nav"
                        >
                            <span>Gestión</span>
                            <ChevronDown
                                size={16}
                                className={`transition-transform ${openGest ? "rotate-180" : ""}`}
                            />
                        </button>

                        <nav
                            id="seguridad-gestion-nav"
                            className={`flex flex-col gap-1 ${openGest ? "" : "hidden"}`}
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

    /* =========================
       LAYOUT FINAL
       ========================= */
    return (
        <>
            <div className="min-h-screen overflow-x-hidden px-0 py-6">
                {/* MOBILE (< md): sidebar normal arriba */}
                <div className="md:hidden px-4 pb-4">
                    <SidebarContent />
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
                    <SidebarContent />
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

            {/* Modal Acceso Denegado */}
            <GlobalAccessDeniedModal />
        </>
    );
}
