import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Guarda de rutas privadas.
 * - Si tu AuthContext expone { user, loading }, lo usa.
 * - Si aún no cargó, muestra un mini loader.
 * - Si no hay user, revisa el accessToken en localStorage.
 */
export default function RequireAuth({ children }: { children?: React.ReactNode }) {
    const { user, loading } = useAuth() as { user?: any; loading?: boolean };
    const loc = useLocation();

    // Mientras verifica sesión (me/refresh), muestra un estado intermedio
    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="text-sm text-neutral-600">Cargando sesión…</div>
            </div>
        );
    }

    // ¿Hay sesión? (user del contexto o token en localStorage)
    const hasSession = !!user || !!localStorage.getItem("accessToken");

    if (!hasSession) {
        // Redirige al login y recuerda adónde quería ir
        return <Navigate to="/login" replace state={{ from: loc }} />;
    }

    // Si se usa como wrapper: <RequireAuth><AppLayout/></RequireAuth>
    if (children) return <>{children}</>;

    // Si se usa como "route element" con <Outlet />
    return <Outlet />;
}
