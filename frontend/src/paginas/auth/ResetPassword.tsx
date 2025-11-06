import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmarReset, solicitarReset } from "@/servicios/auth";

/* Util para mostrar mensajes de error legibles */
async function parseError(e: any) {
    try {
        const res = e?.details?.response ?? e?.response ?? e;
        const txt = await res?.text?.();
        if (!txt) return e?.message ?? String(e);
        try {
            const json = JSON.parse(txt);
            if (json?.message) return json.message;
            if (Array.isArray(json?.errors)) return json.errors.join("\n");
            if (json?.errors && typeof json.errors === "object")
                return (Object.values(json.errors) as any[]).join("\n");
            return txt;
        } catch {
            return txt;
        }
    } catch {
        return e?.message ?? String(e);
    }
}

/** Mapea mensajes técnicos a textos más claros para el usuario */
function humanizeMessage(msg: string) {
    const m = (msg || "").toLowerCase();
    if (m.includes("expir") && m.includes("token")) return "El enlace ya expiró. Solicita uno nuevo.";
    if ((m.includes("usado") || m.includes("used")) && m.includes("token"))
        return "Este enlace ya fue usado. Solicita uno nuevo.";
    if (m.includes("inval") && m.includes("token"))
        return "El enlace no es válido. Solicita uno nuevo.";
    if (m.includes("contraseña") && m.includes("8"))
        return "La nueva contraseña debe tener al menos 8 caracteres.";
    return msg;
}

export default function ResetPasswordPage() {
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    const token = useMemo(() => sp.get("token") ?? "", [sp]);

    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [show1, setShow1] = useState(false);
    const [show2, setShow2] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<null | "ok" | "fail">(null);
    const [error, setError] = useState<string | null>(null);

    // “Solicitar nuevo enlace”
    const [askNewOpen, setAskNewOpen] = useState(false);
    const [identifier, setIdentifier] = useState(""); // email o username
    const [askSending, setAskSending] = useState(false);
    const [askSent, setAskSent] = useState(false);

    useEffect(() => {
        if (!token) {
            setDone("fail");
            setError("Falta el token de restablecimiento en la URL.");
        }
    }, [token]);

    const canSubmit = token && pwd.length >= 8 && pwd === pwd2 && !submitting;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            await confirmarReset({ token, nuevaContrasena: pwd });
            setDone("ok");
        } catch (e: any) {
            setDone("fail");
            const raw = await parseError(e);
            setError(humanizeMessage(raw));
        } finally {
            setSubmitting(false);
        }
    }

    async function onAskNewLink(e: React.FormEvent) {
        e.preventDefault();
        if (!identifier.trim()) return;
        setAskSending(true);
        setAskSent(false);
        try {
            // Si contiene '@' lo tratamos como email, si no como username
            const isEmail = identifier.includes("@");
            await solicitarReset(isEmail ? { email: identifier.trim() } : { username: identifier.trim() });
            setAskSent(true); // Siempre 204 aunque no exista, por seguridad
        } catch {
            // Aun si falla, no revelamos. Damos el mismo resultado genérico.
            setAskSent(true);
        } finally {
            setAskSending(false);
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
                    <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
                        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                            Restablecer contraseña
                        </h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            Define una nueva contraseña para tu cuenta.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                        {!token && (
                            <div className="p-3 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 text-sm">
                                Token no encontrado. Abre el enlace directo del correo.
                            </div>
                        )}

                        {done === "ok" ? (
                            <div className="space-y-4">
                                <div className="p-3 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300 text-sm">
                                    ¡Listo! Tu contraseña se actualizó correctamente.
                                </div>
                                <button
                                    type="button"
                                    className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => navigate("/soyanga/login")}
                                >
                                    Ir al login
                                </button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm mb-1 text-neutral-800 dark:text-neutral-200">
                                        Nueva contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={show1 ? "text" : "password"}
                                            className="border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 w-full pr-12 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                            placeholder="Mínimo 8 caracteres"
                                            value={pwd}
                                            onChange={(e) => setPwd(e.target.value)}
                                            minLength={8}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-600 dark:text-neutral-400"
                                            onClick={() => setShow1((s) => !s)}
                                        >
                                            {show1 ? "Ocultar" : "Ver"}
                                        </button>
                                    </div>
                                    <PasswordStrength password={pwd} />
                                </div>

                                <div>
                                    <label className="block text-sm mb-1 text-neutral-800 dark:text-neutral-200">
                                        Confirmar contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={show2 ? "text" : "password"}
                                            className="border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 w-full pr-12 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                            placeholder="Repite la nueva contraseña"
                                            value={pwd2}
                                            onChange={(e) => setPwd2(e.target.value)}
                                            minLength={8}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-600 dark:text-neutral-400"
                                            onClick={() => setShow2((s) => !s)}
                                        >
                                            {show2 ? "Ocultar" : "Ver"}
                                        </button>
                                    </div>
                                    {pwd2 && pwd !== pwd2 && (
                                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                            Las contraseñas no coinciden.
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300 text-sm whitespace-pre-wrap">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className={`w-full px-4 py-2.5 rounded-lg text-white ${
                                        canSubmit
                                            ? "bg-emerald-600 hover:bg-emerald-700"
                                            : "bg-emerald-400/70 cursor-not-allowed"
                                    }`}
                                >
                                    {submitting ? "Guardando…" : "Actualizar contraseña"}
                                </button>

                                <p className="text-[12px] text-neutral-500 dark:text-neutral-400 text-center">
                                    El enlace expira en 60 minutos.
                                </p>

                                {/* Si el token falló, ofrece opción para pedir uno nuevo */}
                                {done === "fail" && (
                                    <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                                        <button
                                            type="button"
                                            className="text-sm text-neutral-700 dark:text-neutral-300 hover:underline"
                                            onClick={() => setAskNewOpen((s) => !s)}
                                        >
                                            {askNewOpen ? "Ocultar" : "Solicitar un nuevo enlace"}
                                        </button>

                                        {askNewOpen && (
                                            <form onSubmit={onAskNewLink} className="mt-3 space-y-2">
                                                <label className="block text-sm text-neutral-700 dark:text-neutral-300">
                                                    Correo o nombre de usuario
                                                </label>
                                                <input
                                                    type="text"
                                                    className="border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 w-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                                    placeholder="ej: usuario@correo.com o miUsuario"
                                                    value={identifier}
                                                    onChange={(e) => setIdentifier(e.target.value)}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!identifier.trim() || askSending}
                                                    className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white disabled:opacity-50"
                                                >
                                                    {askSending ? "Enviando…" : "Enviar nuevo enlace"}
                                                </button>
                                                {askSent && (
                                                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                                        Si existe una cuenta asociada, te llegará un correo con instrucciones.
                                                    </div>
                                                )}
                                            </form>
                                        )}
                                    </div>
                                )}

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/soyanga/inicio")}
                                        className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
                                    >
                                        Volver al inicio
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

function PasswordStrength({ password }: { password: string }) {
    if (!password) return null;
    const rules = [
        { ok: password.length >= 8, label: "8+ caracteres" },
        { ok: /[A-Za-z]/.test(password), label: "letras" },
        { ok: /\d/.test(password), label: "números" },
    ];
    const okCount = rules.filter((r) => r.ok).length;
    return (
        <div className="mt-2">
            <div className="h-1.5 rounded bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <div
                    className="h-1.5"
                    style={{
                        width: `${(okCount / rules.length) * 100}%`,
                        background: "linear-gradient(90deg,#22c55e,#10b981)",
                    }}
                />
            </div>
            <div className="flex gap-3 text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                {rules.map((r, i) => (
                    <span key={i} className={r.ok ? "text-emerald-700 dark:text-emerald-400" : ""}>
            {r.ok ? "✓" : "•"} {r.label}
          </span>
                ))}
            </div>
        </div>
    );
}
