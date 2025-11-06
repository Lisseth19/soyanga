import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "@/servicios/auth";
import type { PerfilDTO } from "@/types/auth";

type DeniedInfo = {
    path?: string;
    method?: string;
} | null;

type AuthCtx = {
    user: PerfilDTO | null;
    loading: boolean;
    login: (usuarioOEmail: string, password: string) => Promise<void>;
    logout: () => void;
    /** ¿tengo permiso X? */
    can: (permiso: string) => boolean;
    /** vuelve a pedir /auth/me y actualiza el perfil en memoria */
    refreshProfile: () => Promise<void>;

    /** info a mostrar cuando el backend respondió 403 */
    deniedInfo: DeniedInfo;
    /** cerrar el modal de acceso denegado */
    clearDenied: () => void;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<PerfilDTO | null>(null);
    const [loading, setLoading] = useState(true);

    // estado para el modal de "acceso denegado"
    const [deniedInfo, setDeniedInfo] = useState<DeniedInfo>(null);

    const clearDenied = () => setDeniedInfo(null);

    /**
     * Trae el perfil del backend y lo guarda.
     * OJO: usamos useCallback porque lo vamos a usar en efectos.
     */
    const refreshProfile = useCallback(async () => {
        const me = await authService.me();
        setUser(me);
    }, []);

    // Al montar: si hay token intento cargar perfil
    useEffect(() => {
        const hasToken = !!localStorage.getItem("accessToken");
        if (!hasToken) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                await refreshProfile();
            } catch {
                // token inválido → limpia sesión
                authService.logout();
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [refreshProfile]);

    // login normal
    const login = async (usuarioOEmail: string, password: string) => {
        const me = await authService.login(usuarioOEmail, password);
        setUser(me);
    };

    // logout normal
    const logout = () => {
        authService.logout();
        setUser(null);
    };

    /**
     * Verificación de permisos:
     * - user.permisos viene de /auth/me
     * - user.roles también
     * - si sos ADMIN, te doy pase libre
     *
     * Ajusta "ADMIN" si tu rol superadmin tiene otro nombre
     */
    const can = (permisoNecesario: string) => {
        const permisos: string[] = user?.permisos ?? [];
        const roles: string[] = (user?.roles ?? []).map(r => String(r).toUpperCase());
        return permisos.includes(permisoNecesario) || roles.includes("ADMIN");
    };

    /**
     * 🔥 Integración clave con httpClient:
     * Tu httpClient dispara window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { path, method } }))
     * cada vez que el backend responde 403.
     *
     * Acá escuchamos eso:
     * - Mostramos el modal global Acceso Denegado
     * - Re-consultamos /auth/me → esto va a actualizar user.permisos
     *   y por lo tanto la UI se re-renderiza y esconde botones
     *   sin necesidad de F5.
     */
    useEffect(() => {
        const handleForbidden = async (ev: Event) => {
            const custom = ev as CustomEvent<{ path: string; method: string }>;

            // 1. Mostrar modal con data útil
            setDeniedInfo({
                path: custom.detail?.path,
                method: custom.detail?.method,
            });

            // 2. Actualizar permisos del usuario al vuelo
            try {
                await refreshProfile();
            } catch {
                // si esto falla por algún motivo (ej: sesión cambió de rol raro),
                // no rompemos nada. Igual mantenemos deniedInfo.
            }
        };

        window.addEventListener("auth:forbidden", handleForbidden);
        return () => {
            window.removeEventListener("auth:forbidden", handleForbidden);
        };
    }, [refreshProfile]);

    return (
        <Ctx.Provider
            value={{
                user,
                loading,
                login,
                logout,
                can,
                refreshProfile,
                deniedInfo,
                clearDenied,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}
