// src/paginas/Login.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";
import agroBg from "@/assets/agro4.jpg";

/* ===== Icons inline ===== */
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
    const { login, user } = useAuth() as { login: (u: string, p: string) => Promise<any>; user?: any };
    const nav = useNavigate();
    const loc = useLocation() as any;

    // Evitar indexación
    useEffect(() => {
        const meta = document.createElement("meta");
        meta.name = "robots";
        meta.content = "noindex,nofollow";
        document.head.appendChild(meta);
        return () => { document.head.removeChild(meta); };
    }, []);

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
    const [caps, setCaps] = useState(false);

    // Toast autodescartable
    useEffect(() => {
        if (!err) return;
        setShowToast(true);
        const t = setTimeout(() => setShowToast(false), 4000);
        return () => clearTimeout(t);
    }, [err]);

    // Persistencia “recordarme”
    useEffect(() => {
        localStorage.setItem("login.remember", remember ? "1" : "0");
        if (!remember) localStorage.removeItem("login.username");
        else if (u.trim()) localStorage.setItem("login.username", u.trim());
    }, [remember, u]);

    const disabled = useMemo(() => loading || !u.trim() || !p.trim(), [loading, u, p]);

    // Si ya hay sesión y entran al login → /inicio
    useEffect(() => {
        if (!user) return;
        const rawFrom = (loc?.state as any)?.from?.pathname as string | undefined;
        const back = rawFrom && !rawFrom.startsWith("/soyanga") ? rawFrom : "/inicio";
        nav(back, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const trySubmit = async () => {
        if (!u.trim()) { setErr("Ingresa tu usuario"); return; }
        if (!p.trim()) { setErr("Ingresa tu contraseña"); return; }
        setErr(null);
        setLoading(true);
        try {
            await login(u, p);
            if (remember) localStorage.setItem("login.username", u.trim());
            const rawFrom = (loc?.state as any)?.from?.pathname as string | undefined;
            const to = rawFrom && !rawFrom.startsWith("/soyanga") ? rawFrom : "/inicio";
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

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void trySubmit();
    };

    // Refs para “Enter → enfoca/manda”
    const userRef = useRef<HTMLInputElement | null>(null);
    const passRef = useRef<HTMLInputElement | null>(null);

    // Enter UX
    const onUserKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!u.trim()) {
                setErr("Ingresa tu usuario"); setShowToast(true);
                userRef.current?.focus(); return;
            }
            passRef.current?.focus();
        }
    };
    const onPassKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!u.trim()) {
                setErr("Ingresa tu usuario"); setShowToast(true);
                userRef.current?.focus(); return;
            }
            if (!p.trim()) {
                setErr("Ingresa tu contraseña"); setShowToast(true);
                passRef.current?.focus(); return;
            }
            void trySubmit();
        }
    };

    // Caps
    const onKeyPass = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const c = (e.getModifierState && e.getModifierState("CapsLock")) || false;
        setCaps(c);
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Fondo de página con imagen + velo verde suave */}
            <div
                className="absolute inset-0 -z-10 bg-cover bg-center"
                style={{ backgroundImage: `url(${agroBg})` }}
                aria-hidden
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-emerald-900/35 via-emerald-800/20 to-emerald-700/10" />

            {/* Tarjeta partida (más grande) */}
            <div className="min-h-screen w-full grid place-items-center p-4">
                {/* Toast de error */}
                {err && showToast && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_200ms_ease-out]">
                        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
                            {err}
                        </div>
                    </div>
                )}

                <div className="w-full max-w-[980px] rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden bg-white/90 backdrop-blur">
                    <div className="grid md:grid-cols-2">
                        {/* Panel izquierdo (branding) */}
                        <div className="relative min-h-[540px] bg-emerald-900 group">
                            {/* Fondo con la misma imagen */}
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${agroBg})` }}
                                aria-hidden
                            />
                            {/* ANTES: bg-emerald-950/70  ->  AHORA: /85 (menos transparente) */}
                            <div className="absolute inset-0 bg-emerald-950/90" />

                            <div className="relative z-[1] h-full p-8 sm:p-10 flex flex-col">
                                {/* LOGO marca de agua con animación al hover */}
                                <img
                                    src={logo}
                                    alt=""
                                    aria-hidden
                                    className="pointer-events-none select-none absolute -z-10 opacity-10
                 transition-transform duration-700 ease-out
                 group-hover:translate-x-4 group-hover:-translate-y-1 group-hover:scale-[1.02]"
                                    style={{
                                        width: 640,
                                        right: -60,
                                        bottom: -40,
                                        filter: "grayscale(100%) brightness(1.5) contrast(1.05)",
                                        transform: "rotate(-6deg)",
                                    }}
                                    draggable={false}
                                />

                                <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur ring-1 ring-white/20 w-fit">
                                    <span>🌿</span>
                                    <span className="text-white/95 text-[13px] tracking-wide">
                    Agroimportadora — Gestión integral
                  </span>
                                </div>

                                <h1 className="text-4xl sm:text-5xl font-black leading-tight text-white drop-shadow">
                                    SOYANGA
                                </h1>
                                <p className="mt-2 text-white/90 text-[15px] max-w-md">
                                    Compras, proveedores, ventas y control de inventario por lote en un solo lugar.
                                </p>

                                <div className="mt-auto grid grid-cols-2 gap-2 text-sm text-white/90">
                                    <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2">📦 Stock & productos</div>
                                    <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2">🧪 Lotes & vencimientos</div>
                                    <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2">🏬 Multi-almacén</div>
                                    <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2">🔐 Roles & auditoría</div>
                                </div>
                            </div>
                        </div>

                        {/* Panel derecho (form) */}
                        <div className="p-6 sm:p-10">
                            <form
                                onSubmit={onSubmit}
                                className="mx-auto w-full max-w-md"
                            >
                                {/* Encabezado */}
                                <div className="mb-7 text-center">
                                    <div className="mx-auto mb-4 h-14 w-auto flex items-center justify-center">
                                        <img src={logo} alt="Soyanga" className="h-25 w-auto" />
                                    </div>
                                    <h2 className="text-[22px] font-semibold tracking-tight text-green-900">
                                        Iniciar sesión
                                    </h2>
                                    <p className="text-sm text-green-800/80">Accede al panel de gestión</p>
                                </div>

                                {/* Usuario */}
                                <div className="space-y-1 mb-4">
                                    <label htmlFor="usuario" className="text-sm text-green-900">Usuario</label>
                                    <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-800/60 group-focus-within:text-green-900 transition-colors">
                      <UserIcon className="h-5 w-5" />
                    </span>
                                        <input
                                            id="usuario"
                                            ref={userRef}
                                            className="w-full rounded-lg border border-green-800/20 bg-white px-10 py-2 outline-none
                                 focus:border-green-700/40 focus:ring-2 focus:ring-green-600/20 transition
                                 text-neutral-800 placeholder-green-900/35 caret-green-700"
                                            autoFocus
                                            autoComplete="username"
                                            value={u}
                                            onChange={(e) => setU(e.target.value)}
                                            onKeyDown={onUserKeyDown}
                                            placeholder="Username"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1 mb-5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="password" className="text-sm text-green-900">Contraseña</label>
                                        {caps && (
                                            <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Bloq Mayús activado
                      </span>
                                        )}
                                    </div>
                                    <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-800/60 group-focus-within:text-green-900 transition-colors">
                      <LockIcon className="h-5 w-5" />
                    </span>
                                        <input
                                            id="password"
                                            ref={passRef}
                                            type={show ? "text" : "password"}
                                            onKeyUp={onKeyPass}
                                            onKeyDown={(e) => { onKeyPass(e); onPassKeyDown(e); }}
                                            onBlur={() => setCaps(false)}
                                            className="w-full rounded-lg border border-green-800/20 bg-white px-10 py-2 pr-10 outline-none
                                 focus:border-green-700/40 focus:ring-2 focus:ring-green-600/20 transition
                                 text-neutral-800 placeholder-green-900/35 caret-green-700"
                                            value={p}
                                            onChange={(e) => setP(e.target.value)}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShow(!show)}
                                            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-green-800/60 hover:text-green-900 transition"
                                        >
                                            {show ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Recordarme + Olvidé */}
                                <div className="mb-6 flex items-center justify-between gap-3">
                                    <label className="inline-flex items-center gap-2 text-sm text-green-900 select-none">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-green-700/40 text-green-700 focus:ring-green-600"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                        />
                                        Recordarme
                                    </label>
                                    <Link
                                        to="/soyanga/reset-password"
                                        className="text-sm text-green-700 hover:text-green-800 underline underline-offset-4"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>

                                {/* Submit */}
                                <button
                                    className="grid w-full place-items-center rounded-lg bg-green-700 text-white py-2.5
                             hover:bg-green-800 transition shadow-md disabled:opacity-50"
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

                                {/* Footer */}
                                <div className="mt-5 text-[11px] text-green-900/60 text-center">
                                    © {new Date().getFullYear()} Soyanga — Acceso de personal autorizado
                                    <div className="mt-1">
                                        <Link to="/soyanga/contacto" className="text-green-700 underline underline-offset-4 hover:text-green-800">
                                            Necesito ayuda
                                        </Link>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            </div>

            {/* keyframes */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
