const K_ACCESS = "auth_access_token";
const K_REFRESH = "auth_refresh_token";
const K_EXPIRES = "auth_access_exp"; // epoch ms opcional

export function saveTokens(t: { accessToken: string; refreshToken: string; expiresIn?: number }) {
    localStorage.setItem(K_ACCESS, t.accessToken);
    localStorage.setItem(K_REFRESH, t.refreshToken);
    if (t.expiresIn && Number.isFinite(t.expiresIn)) {
        const expMs = Date.now() + t.expiresIn * 1000;
        localStorage.setItem(K_EXPIRES, String(expMs));
    } else {
        localStorage.removeItem(K_EXPIRES);
    }
}

export function getAccessToken(): string | null {
    return localStorage.getItem(K_ACCESS);
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(K_REFRESH);
}

export function isAccessExpiredSoon(bufferSec = 15): boolean {
    const raw = localStorage.getItem(K_EXPIRES);
    if (!raw) return false;
    const exp = Number(raw);
    return Number.isFinite(exp) && Date.now() + bufferSec * 1000 >= exp;
}

export function clearSession() {
    localStorage.removeItem(K_ACCESS);
    localStorage.removeItem(K_REFRESH);
    localStorage.removeItem(K_EXPIRES);
}
