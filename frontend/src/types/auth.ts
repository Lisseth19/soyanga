// src/types/auth.ts
/* ===== Login / Tokens ===== */
export interface AuthLoginDTO {
    usuarioOEmail: string;
    password: string;
}

export interface AuthTokensDTO {
    accessToken: string;
    /** Puede venir null o ausente según el flujo (por eso opcional + null) */
    refreshToken?: string | null;
    tokenType?: string;   // p.ej. "Bearer"
    expiresIn?: number;   // opcional (segundos)
}

/* ===== Perfil (payload que guardas en tu AuthContext) ===== */
export interface PerfilDTO {
    id: number;
    username: string;
    nombreCompleto?: string | null;
    roles: string[];
    permisos?: string[];
    email?: string | null; // opcional, por si lo necesitas en UI
}

/* ===== Restablecer contraseña (público) ===== */
// Confirmar el restablecimiento con el token del correo
export interface PasswordResetConfirmDTO {
    token: string;
    nuevaContrasena: string;
}

// (Opcional) Solicitar enlace de reset desde "Olvidé mi contraseña"
// Versión simple (ambos opcionales; valida en runtime):
export interface PasswordResetRequestDTO {
    email?: string;
    username?: string;
}

// Si se quiere forzar en TypeScript que exista al menos uno, se puede usar (opcional):
// export type PasswordResetRequestDTO =
//   | { email: string; username?: never }
//   | { username: string; email?: never };

/* ===== Cambiar contraseña (logueado) ===== */
export interface CambiarPasswordDTO {
    contrasenaActual: string;
    nuevaContrasena: string;
    confirmarContrasena?: string; // validación en front
}

/* ===== Enviar enlace de reset para otro usuario (admin) ===== */
export interface EnviarResetPorEmailDTO {
    resetPorEmail: true;
}
