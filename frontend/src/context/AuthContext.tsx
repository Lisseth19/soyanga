import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/servicios/auth";
import type { PerfilDTO } from "@/types/auth";

type AuthCtx = {
    user: PerfilDTO | null;
    loading: boolean;
    login: (usuarioOEmail: string, password: string) => Promise<void>;
    logout: () => void;
    /** Reevalúa permisos contra el perfil actual */
    can: (permiso: string) => boolean;
    /** Vuelve a pedir /auth/me y actualiza el perfil en memoria */
    refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<PerfilDTO | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        const me = await authService.me();
        setUser(me);
    };

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
    }, []);

    const login = async (usuarioOEmail: string, password: string) => {
        const me = await authService.login(usuarioOEmail, password);
        setUser(me);
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    /** Helper de permisos (usa nombres tal cual vienen en /auth/me) */
    const can = (perm: string) => {
        const permisos: string[] = user?.permisos ?? [];
        // Normalizamos roles a MAYÚSCULA para comparar
        const roles: string[] = (user?.roles ?? []).map(r => String(r).toUpperCase());
        // Si tu “rol superadmin” se llama distinto, cambia "ADMIN" aquí
        return permisos.includes(perm) || roles.includes("ADMIN");
    };

    return (
        <Ctx.Provider value={{ user, loading, login, logout, can, refreshProfile }}>
            {children}
        </Ctx.Provider>
    );
}
