export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:8084';
    const opts: RequestInit = { ...init };
    const method = (opts.method || 'GET').toUpperCase();
    if (method !== 'GET') {
        opts.headers = { 'Content-Type': 'application/json', ...(init?.headers || {}) };
    }
    const res = await fetch(base + path, opts);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
}
