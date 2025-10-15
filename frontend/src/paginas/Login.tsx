import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// ==== Icons ====
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/>
        </svg>
    );
}
function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M10.6 5.1C11.04 5.03 11.51 5 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-4.08 4.99M6.1 6.9A18.97 18.97 0 0 0 2 12s3.5 7 10 7c1.47 0 2.83-.3 4.04-.81" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" stroke="currentColor" strokeWidth="1.7"/>
        </svg>
    );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M3.5 20.5a8.5 8.5 0 0 1 17 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
    );
}
function LockIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
    );
}

export default function LoginPage() {
    const { login } = useAuth();
    const nav = useNavigate();
    const loc = useLocation() as any;

    // Recordarme (solo usuario)
    const storedRemember = localStorage.getItem("login.remember") === "1";
    const storedUser = localStorage.getItem("login.username") ?? "";

    const [u, setU] = useState(storedRemember ? storedUser : "");
    const [p, setP] = useState("");
    const [remember, setRemember] = useState(storedRemember);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [show, setShow] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // auto-hide del toast de error
    useEffect(() => {
        if (!err) return;
        setShowToast(true);
        const t = setTimeout(() => setShowToast(false), 4000); // ~4s
        return () => clearTimeout(t);
    }, [err]);

    // persistencia del “recordarme”
    useEffect(() => {
        localStorage.setItem("login.remember", remember ? "1" : "0");
        if (!remember) localStorage.removeItem("login.username");
        else if (u.trim()) localStorage.setItem("login.username", u.trim());
    }, [remember, u]);

    const disabled = useMemo(() => loading || !u.trim() || !p.trim(), [loading, u, p]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            await login(u, p);
            if (remember) localStorage.setItem("login.username", u.trim());
            const to = loc?.state?.from?.pathname || "/";
            nav(to, { replace: true });
        } catch (e: any) {
            const msg = typeof e?.message === "string" && e.message.trim()
                ? e.message
                : "Usuario o contraseña inválidos";
            setErr(msg);
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white">
            {/* Izquierda: bloque visual / mensaje */}
            <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
                {/* Fondo con degradado suave + “textura” */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage:
                            "radial-gradient(1200px 400px at 10% 10%, rgba(255,255,255,0.15), transparent), radial-gradient(800px 300px at 90% 20%, rgba(255,255,255,0.12), transparent), radial-gradient(700px 300px at 40% 90%, rgba(255,255,255,0.10), transparent)",
                    }}
                />
                {/* Contenido */}
                <div className="relative z-10 max-w-xl px-10 py-12 text-white">
                    <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                        <span className="text-xl">🌿</span>
                        <span className="text-sm tracking-wide">Agroinsumos & Gestión de Inventario</span>
                    </div>
                    <h2 className="text-4xl font-semibold leading-tight">
                        Control preciso de lotes, vencimientos y almacenes
                    </h2>
                    <p className="mt-4 text-white/90">
                        Consulta disponibilidad, filtra por almacén, fecha y SKU. Visualiza movimientos por lote y exporta tus datos en segundos.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-sm">📦 Productos</span>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-sm">🧪 Lotes & Vencimientos</span>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-sm">🏬 Almacenes</span>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-sm">🔐 Acceso seguro</span>
                    </div>
                    <p className="mt-10 text-xs text-white/80">© {new Date().getFullYear()} Soyanga</p>
                </div>
            </div>

            {/* Derecha: formulario */}
            <div className="relative flex items-center justify-center p-6 sm:p-10">
                {/* Toast de error (arriba, auto-cierre) */}
                {err && showToast && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 toast-in">
                        <div className="rounded-lg border border-red-200 bg-white/95 px-4 py-2 text-sm text-red-700 shadow-md">
                            {err}
                        </div>
                    </div>
                )}

                {/* Sutil halo */}
                <div className="pointer-events-none absolute -z-10 inset-0">
                    <div className="absolute -top-16 -right-16 h-64 w-64 bg-emerald-200/60 blur-3xl rounded-full" />
                </div>

                <form
                    onSubmit={onSubmit}
                    className="w-[min(440px,94vw)] rounded-2xl bg-white/90 backdrop-blur p-6 sm:p-8 shadow-xl ring-1 ring-neutral-200"
                >
                    {/* Encabezado centrado */}
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-3 h-10 w-10 grid place-items-center rounded-full bg-emerald-100">
                            <span className="text-emerald-700">🌱</span>
                        </div>
                        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
                            Iniciar sesión
                        </h1>
                        <p className="text-sm text-neutral-500">
                            Accede al panel de gestión
                        </p>
                    </div>

                    {/* Usuario */}
                    <div className="space-y-1 mb-4">
                        <label htmlFor="usuario" className="text-sm text-neutral-700">Usuario</label>
                        <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <UserIcon className="h-5 w-5" />
              </span>
                            <input
                                id="usuario"
                                className="w-full rounded-lg border border-neutral-300 bg-white px-10 py-2 outline-none ring-emerald-200 focus:border-emerald-400 focus:ring-2 transition"
                                autoFocus
                                autoComplete="username"
                                value={u}
                                onChange={(e) => setU(e.target.value)}
                                placeholder="tu_usuario"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1 mb-5">
                        <label htmlFor="password" className="text-sm text-neutral-700">Contraseña</label>
                        <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <LockIcon className="h-5 w-5" />
              </span>
                            <input
                                id="password"
                                type={show ? "text" : "password"}
                                className="w-full rounded-lg border border-neutral-300 bg-white px-10 py-2 pr-10 outline-none ring-emerald-200 focus:border-emerald-400 focus:ring-2 transition"
                                value={p}
                                onChange={(e) => setP(e.target.value)}
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShow((s) => !s)}
                                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                                // 👇 sin borde/fondo: solo ícono
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                            >
                                {show ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Recordarme */}
                    <div className="mb-6 text-center">
                        <label className="inline-flex items-center gap-2 text-sm text-neutral-700 select-none">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            Recordarme (autorrellenar usuario)
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        className="grid w-full place-items-center rounded-lg bg-emerald-600 text-white py-2.5 hover:bg-emerald-700 disabled:opacity-50 transition"
                        disabled={disabled}
                        type="submit"
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-b-transparent" />
                Ingresando…
              </span>
                        ) : (
                            "Ingresar"
                        )}
                    </button>

                    <p className="mt-5 text-[11px] text-neutral-500 text-center">
                        © {new Date().getFullYear()} Soyanga — Acceso de personal autorizado
                    </p>
                </form>
            </div>
        </div>
    );
}
