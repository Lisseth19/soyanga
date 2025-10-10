export interface AuthLoginDTO {
    usuarioOEmail: string;
    password: string;
}

export interface AuthTokensDTO {
    accessToken: string;
    refreshToken: string;
    tokenType?: string;   // ej. "Bearer"
    expiresIn?: number;   // opcional (segundos)
}

export interface PerfilDTO {
    id: number;
    username: string;
    nombreCompleto?: string | null;
    roles: string[];
    permisos?: string[];
}

