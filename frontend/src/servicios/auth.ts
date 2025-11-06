// src/servicios/auth.ts
import { http, ApiError, saveTokens, clearTokens, startTokenWatch } from "@/servicios/httpClient";
import type {
    PerfilDTO,
    PasswordResetConfirmDTO,
    PasswordResetRequestDTO,
} from "@/types/auth";

/* ================== Helpers de tokens ================== */

/** Extrae tokens cualquiera sea la forma que devuelva el backend */
function pickTokens(raw: any): { accessToken?: string; refreshToken?: string | null } {
    if (!raw || typeof raw !== "object") return {};
    const accessToken =
        raw.accessToken ?? raw.access_token ?? raw.token ?? raw.jwt ?? raw.id_token ?? null;
    const refreshToken = raw.refreshToken ?? raw.refresh_token ?? raw.refresh ?? null;
    return { accessToken: accessToken ?? undefined, refreshToken };
}

/** Normaliza el perfil a tu interfaz PerfilDTO */
function normalizePerfil(raw: any): PerfilDTO {
    const nombre =
        (raw?.nombreCompleto && String(raw.nombreCompleto)) ||
        ([raw?.nombres, raw?.apellidos].filter(Boolean).join(" ") || null);

    const rolesArr = Array.isArray(raw?.roles)
        ? raw.roles.map((r: any) => (typeof r === "string" ? r : (r?.nombre ?? r))).filter(Boolean)
        : Array.isArray(raw?.rolesNombres)
            ? raw.rolesNombres
            : [];

    const permisosArr = Array.isArray(raw?.permisos)
        ? raw.permisos.map((p: any) => (typeof p === "string" ? p : (p?.nombre ?? p))).filter(Boolean)
        : Array.isArray(raw?.permisosNombres)
            ? raw.permisosNombres
            : [];

    return {
        id: Number(raw?.id ?? raw?.idUsuario ?? raw?.userId ?? 0),
        username: String(raw?.username ?? raw?.nombreUsuario ?? raw?.user ?? ""),
        nombreCompleto: nombre,
        roles: rolesArr,
        permisos: permisosArr,
        email: raw?.email ?? raw?.correo ?? raw?.correoElectronico ?? null, // opcional
    };
}

/* ========= Endpoints públicos para reset de contraseña ========= */

/** Confirmar restablecimiento de contraseña (público, sin auth) */
export async function confirmarReset(payload: PasswordResetConfirmDTO): Promise<void> {
    // Backend: POST /api/v1/auth/password-reset/confirm
    // Client usa base "/api", por eso solo /v1/...
    await http.post("/v1/auth/password-reset/confirm", payload, { auth: false });
}

/** Solicitar un nuevo enlace desde “Olvidé mi contraseña” (público, sin auth) */
export async function solicitarReset(payload: PasswordResetRequestDTO): Promise<void> {
    // Backend: POST /api/v1/auth/password-reset/request
    await http.post("/v1/auth/password-reset/request", payload, { auth: false });
}

/* ====================== Servicio principal ====================== */

export const authService = {
    /** Login con manejo amable de errores 401/403 */
    async login(usuarioOEmail: string, password: string): Promise<PerfilDTO> {
        try {
            // auth:false para NO enviar Authorization
            const raw = await http.post<any>("/v1/auth/login", { usuarioOEmail, password }, { auth: false });

            // guarda tokens y arranca watcher
            const { accessToken, refreshToken } = pickTokens(raw);
            if (!accessToken) throw new Error("El backend no devolvió accessToken");
            saveTokens({ accessToken, refreshToken });
            startTokenWatch(accessToken);

            // trae el perfil
            const meRaw = await http.get<any>("/v1/auth/me");
            return normalizePerfil(meRaw);
        } catch (e: any) {
            if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
                throw new Error("Usuario o contraseña inválidos");
            }
            throw e;
        }
    },

    /** Perfil del usuario logueado */
    async me(): Promise<PerfilDTO> {
        const raw = await http.get<any>("/v1/auth/me");
        return normalizePerfil(raw);
    },

    /** Refresh manual (el httpClient ya intenta en 401 de forma automática) */
    async refresh(): Promise<boolean> {
        const rt = localStorage.getItem("refreshToken");
        if (!rt) return false;

        // Importante: el backend espera un JSON con string (el coreFetch hace JSON.stringify)
        const raw = await http.post<any>("/v1/auth/refresh", rt, {
            auth: false, // refresh no lleva Authorization
            headers: { "Content-Type": "application/json" },
        });

        const { accessToken, refreshToken } = pickTokens(raw);
        if (!accessToken) return false;
        saveTokens({ accessToken, refreshToken });
        startTokenWatch(accessToken);
        return true;
    },

    logout() {
        clearTokens(); // limpia y detiene watcher
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem("accessToken");
    },

    // También disponibles dentro del servicio
    confirmarReset,
    solicitarReset,
};
