// src/paginas/publico/MetodosPago.tsx
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import qrSoyanga from "@/assets/qr-soyanga.png";

/** ===== Config ===== */
const NEGOCIO = "Agroimportación Soyanga";
const UBICACION = "Santa Cruz, Bolivia";
const WHATSAPP_NUMBER = "59169218189"; // sin "+"

// Datos de cuenta (reemplaza por los reales)
const BANK_NAME = "Banco Unión";
const ACCOUNT_NUMBER = "123-4567890-01";
const ACCOUNT_HOLDER = "Agroimportación Soyanga";
const NIT = "123456789";

/** ===== Helpers ===== */
function CopyBtn({
                     label,
                     value,
                     onCopied,
                 }: {
    label: string;
    value: string;
    onCopied?: () => void;
}) {
    const [ok, setOk] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setOk(true);
            onCopied?.();
            setTimeout(() => setOk(false), 1200);
        } catch {
            // noop
        }
    };
    return (
        <button
            onClick={copy}
            className="ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--fg)] hover:bg-[var(--fg)]/5"
            title={`Copiar ${label}`}
            aria-label={`Copiar ${label}`}
        >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <rect x="2" y="2" width="13" height="13" rx="2" />
            </svg>
            {ok ? "Copiado" : "Copiar"}
        </button>
    );
}

export default function MetodosPagoPage() {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const waHref = useMemo(() => {
        const saludo =
            `Hola ${NEGOCIO}, adjunto/comparto el *comprobante de pago* ` +
            `de mi cotización. Quedo atento(a) a la confirmación. Gracias.`;
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(saludo)}`;
    }, []);

    return (
        <section className="mx-auto max-w-7xl px-4 py-4">
            {/* Migas */}
            <nav className="mb-3 text-sm text-muted">
                <Link to="/soyanga/inicio" className="hover:underline">Inicio</Link>
                <span className="mx-2">/</span>
                <span className="text-[var(--fg)]/90">Métodos de pago</span>
            </nav>

            {/* GRID:
          Fila 1: Header (col-span-2)
          Fila 2: izquierda = Transferencia/Caja, derecha = QR
          En móvil: Título → QR → Transferencia/Caja (orden DOM)
      */}
            <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:auto-rows-min">
                {/* Fila 1: Encabezado */}
                <header className="lg:col-span-2">
                    <h1 className="text-2xl font-bold leading-tight">Métodos de pago</h1>
                    <p className="mt-1 text-[13px] text-muted">
                        {NEGOCIO} • {UBICACION}
                    </p>
                </header>

                {/* Fila 2: QR (derecha) — más arriba */}
                <aside className="lg:col-start-2 lg:row-start-2 h-fit lg:sticky lg:top-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <h2 className="text-base font-semibold">Pago con QR</h2>

                    <div className="mt-1.5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--light-bg)]">
                        <div className="aspect-square w-full bg-black/5 grid place-items-center p-2.5">
                            <img
                                src={qrSoyanga}
                                alt="Código QR de pago Soyanga"
                                className="max-h-[360px] max-w-full object-contain select-none"
                                draggable={false}
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    </div>

                    <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
                        <li>Abre tu app bancaria o billetera móvil.</li>
                        <li>Escanea el QR y verifica el titular: <span className="font-medium">{ACCOUNT_HOLDER}</span>.</li>
                        <li>Ingresa el monto y confirma el pago.</li>
                        <li>Guarda el comprobante para validación.</li>
                    </ol>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <a
                            href={qrSoyanga}
                            download="QR-Soyanga.png"
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-center hover:bg-[var(--fg)]/5"
                            title="Descargar QR"
                        >
                            Descargar QR
                        </a>
                        <a
                            href={waHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
                            title="Enviar comprobante por WhatsApp"
                        >
                            <svg className="h-4.5 w-4.5" viewBox="0 0 32 32" aria-hidden="true">
                                <path fill="currentColor" d="M19.11 17.59a3.86 3.86 0 0 1-1.25-.2c-.38-.13-.86-.45-1.49-.88a9.22 9.22 0 0 1-2.71-2.7c-.43-.64-.75-1.12-.88-1.51a3.72 3.72 0 0 1-.19-1.24 2 2 0 0 1 .63-1.49l.45-.45a.66.66 0 0 1 .47-.2h.35a.53.53 0 0 1 .38.13c.12.1.3.41.53.89l.18.39c.12.27.2.48.23.64a.89.89 0 0 1-.15.81l-.24.31a.44.44 0 0 0 0 .48c.14.24.43.6.86 1a8.21 8.21 0 0 0 1.26.9.44.44 0 0 0 .48 0l.31-.24a.89.89 0 0 1 .81-.15c.16 0 .37.11.64.23l.39.18c.48.23.79.41.89.53a.53.53 0 0 1 .13.38v.35a.66.66 0 0 1-.2.47l-.45.45a2 2 0 0 1-1.49.63Z"/>
                                <path fill="currentColor" d="M27.1 4.9A13.94 13.94 0 0 0 16 1a14 14 0 0 0-12 21.15L2.67 31L11 27a14 14 0 0 0 16.1-22.1ZM16 25a11 11 0 1 1 11-11a11 11 0 0 1 11 11Z"/>
                            </svg>
                            Enviar por WhatsApp
                        </a>
                    </div>

                    <p className="mt-3 text-[12px] text-muted">
                        Si tu app no admite el formato del QR, realiza una transferencia con los datos de la cuenta o paga en caja.
                    </p>
                </aside>

                {/* Fila 2: Transferencia/Caja (izquierda) */}
                <main className="lg:col-start-1 lg:row-start-2 space-y-4">
                    {/* Transferencia / Depósito */}
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-base font-semibold">Transferencia o depósito bancario</h2>
                            {copiedField && (
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400" aria-live="polite">
                  {copiedField} copiado
                </span>
                            )}
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {/* Banco (sin copiar) */}
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3">
                                <div className="text-[12px] text-muted">Banco</div>
                                <div className="mt-1 flex items-center text-[15px] font-semibold select-none">
                                    {BANK_NAME}
                                </div>
                            </div>

                            {/* N° de cuenta (sí copiar) */}
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3">
                                <div className="text-[12px] text-muted">N° de cuenta</div>
                                <div className="mt-1 flex items-center text-[15px] font-semibold">
                                    {ACCOUNT_NUMBER}
                                    <CopyBtn
                                        label="N° de cuenta"
                                        value={ACCOUNT_NUMBER}
                                        onCopied={() => setCopiedField("N° de cuenta")}
                                    />
                                </div>
                            </div>

                            {/* Titular (sin copiar) */}
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3">
                                <div className="text-[12px] text-muted">Titular</div>
                                <div className="mt-1 flex items-center text-[15px] font-semibold select-none">
                                    {ACCOUNT_HOLDER}
                                </div>
                            </div>

                            {/* NIT (sí copiar) */}
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3">
                                <div className="text-[12px] text-muted">NIT</div>
                                <div className="mt-1 flex items-center text-[15px] font-semibold">
                                    {NIT}
                                    <CopyBtn label="NIT" value={NIT} onCopied={() => setCopiedField("NIT")} />
                                </div>
                            </div>
                        </div>

                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] text-muted">
                            <li>Usa como referencia: <span className="font-medium">“Cotización + tu nombre”</span>.</li>
                            <li>Conserva el comprobante para validarlo por WhatsApp o en caja.</li>
                        </ul>
                    </section>

                    {/* Pago en caja (efectivo) */}
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <h2 className="text-base font-semibold">Pago en caja (efectivo)</h2>
                        <p className="mt-2 text-[13px] leading-relaxed text-muted">
                            También puedes cancelar tu cotización en efectivo en nuestra caja. Emitimos el comprobante en el acto.
                            Si hiciste tu pedido por la web o WhatsApp, menciona tu nombre para ubicar la cotización rápidamente.
                        </p>
                    </section>
                </main>
            </div>

            {/* Nota legal / recordatorio */}
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-[12.5px] text-muted">
                    *Importante:* los precios son referenciales y dependen de disponibilidad. Confirmaremos tu pago cuando recibamos el comprobante.
                </p>
            </div>
        </section>
    );
}
