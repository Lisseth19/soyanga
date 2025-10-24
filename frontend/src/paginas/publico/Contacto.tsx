// src/paginas/publico/Contacto.tsx
import { Link } from "react-router-dom";
import { useMemo } from "react";

/** ===== Config ===== */
const NEGOCIO = "Agroimportación Soyanga";
const PROVINCIA = "Ichilo";
const DEPARTAMENTO = "Santa Cruz";
const PAIS = "Bolivia";
const UBICACION_TXT = `${PROVINCIA}, ${DEPARTAMENTO}, ${PAIS}`;

const WHATSAPP_NUMBER = "59169218189"; // sin "+"
const PHONE_E164 = "+59169218189";     // para <a href="tel:...">
const EMAIL = "ventas@soyanga.bo";

// Coordenadas (solo para el mapa, no se muestran en texto)
const LAT = -17.39957416886035;
const LNG = -63.826279638901156;

//  Sustituir por tus enlaces reales de redes
const SOCIALS = [
    { name: "Facebook",  href: "#", icon: FacebookIcon },
    { name: "Instagram", href: "#", icon: InstagramIcon },
    { name: "TikTok",    href: "#", icon: TikTokIcon },
];

/** ===== Iconos ===== */
function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.66 19.66 0 0 1-8.56-3.22A19.3 19.3 0 0 1 3.3 12.74 19.66 19.66 0 0 1 .08 4.18 2 2 0 0 1 2.06 2h3a2 2 0 0 1 2 1.72c.13.98.36 1.93.67 2.84a2 2 0 0 1-.45 2.11L6.1 9.9a16 16 0 0 0 7 7l1.23-1.14a2 2 0 0 1 2.12-.45c.91.31 1.86.54 2.84.67A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}
function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
            <path fill="currentColor" d="M19.11 17.59a3.86 3.86 0 0 1-1.25-.2c-.38-.13-.86-.45-1.49-.88a9.22 9.22 0 0 1-2.71-2.7c-.43-.64-.75-1.12-.88-1.51a3.72 3.72 0 0 1-.19-1.24 2 2 0 0 1 .63-1.49l.45-.45a.66.66 0 0 1 .47-.2h.35a.53.53 0 0 1 .38.13c.12.1.3.41.53.89l.18.39c.12.27.2.48.23.64a.89.89 0 0 1-.15.81l-.24.31a.44.44 0 0 0 0 .48c.14.24.43.6.86 1a8.21 8.21 0 0 0 1.26.9.44.44 0 0 0 .48 0l.31-.24a.89.89 0 0 1 .81-.15c.16 0 .37.11.64.23l.39.18c.48.23.79.41.89.53a.53.53 0 0 1 .13.38v.35a.66.66 0 0 1-.2.47l-.45.45a2 2 0 0 1-1.49.63Z" />
            <path fill="currentColor" d="M27.1 4.9A13.94 13.94 0 0 0 16 1a14 14 0 0 0-12 21.15L2.67 31L11 27a14 14 0 0 0 16.1-22.1ZM16 25a11 11 0 1 1 11-11a11 11 0 0 1 11 11Z" />
        </svg>
    );
}
function MailIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="m22 6-10 7L2 6" />
        </svg>
    );
}
function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}
function ExternalIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
            <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
        </svg>
    );
}
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9c1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5V12h2.8l-.45 2.9h-2.35v7A10 10 0 0 0 22 12Z" />
        </svg>
    );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10a5 5 0 0 0 0-10Zm6.5-.25a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 0 0 0-2.5ZM12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
        </svg>
    );
}
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
            <path d="M30 5a12.9 12.9 0 0 0 9 4V16a20 20 0 0 1-9-3.1V29a11 11 0 1 1-11-11a11.2 11.2 0 0 1 2 .2v7a4 4 0 1 0 2 3.5V5Z"/>
        </svg>
    );
}

export default function ContactoPage() {
    // Más zoom del mapa (z=18)
    const mapEmbedSrc = useMemo(
        () => `https://www.google.com/maps?q=${LAT},${LNG}&z=17&hl=es&output=embed`,
        []
    );
    const mapsDirections = useMemo(
        () => `https://www.google.com/maps?daddr=${LAT},${LNG}`,
        []
    );
    const waHref = useMemo(() => {
        const msg = `Hola ${NEGOCIO}, quisiera más información.`;
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    }, []);

    return (
        <section className="mx-auto max-w-7xl px-4 py-6">
            {/* Migas */}
            <nav className="mb-4 text-sm text-muted">
                <Link to="/soyanga/inicio" className="hover:underline">Inicio</Link>
                <span className="mx-2">/</span>
                <span className="text-[var(--fg)]/90">Contáctanos</span>
            </nav>

            <header className="mb-4">
                <h1 className="text-2xl font-bold">Contáctanos</h1>
                <p className="mt-1 text-sm text-muted">
                    {NEGOCIO} • {UBICACION_TXT}
                </p>
            </header>

            {/* En móvil el MAPA va primero; en desktop queda a la derecha (sticky) */}
            <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
                {/* MAPA */}
                <aside className="order-1 lg:order-2 h-fit lg:sticky lg:top-20 lg:self-start rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <MapPinIcon className="h-5 w-5" /> Ubicación en mapa
                        </h2>
                        {/* Etiqueta de ubicación elegante */}
                        <span className="rounded-full border border-[var(--border)] bg-[var(--light-bg)] px-3 py-1 text-xs text-muted">
              {UBICACION_TXT}
            </span>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--light-bg)]">
                        <div className="aspect-[4/3] w-full bg-black/5 md:h-[420px]">
                            <iframe
                                title="Mapa de ubicación Soyanga"
                                src={mapEmbedSrc}
                                width="100%"
                                height="100%"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                style={{ border: 0 }}
                                allowFullScreen
                            />
                        </div>
                    </div>

                    <div className="mt-3">
                        <a
                            href={mapsDirections}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--fg)]/5"
                            title="Abrir en Google Maps"
                        >
                            <ExternalIcon className="h-4 w-4" />
                            Abrir en Google Maps
                        </a>
                    </div>
                </aside>

                {/* DETALLES Y CANALES (en móvil van después del mapa) */}
                <div className="order-2 lg:order-1 space-y-6">
                    {/* Canales de contacto */}
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <h2 className="text-base font-semibold">Canales de contacto</h2>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {/* WhatsApp */}
                            <a
                                href={waHref}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3 hover:bg-[var(--fg)]/5"
                                title="Escribir por WhatsApp"
                            >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                                <div className="min-w-0">
                                    <div className="text-[13px] text-muted">WhatsApp</div>
                                    <div className="text-[15px] font-semibold break-all">+{WHATSAPP_NUMBER}</div>
                                </div>
                            </a>

                            {/* Llamar */}
                            <a
                                href={`tel:${PHONE_E164}`}
                                className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3 hover:bg-[var(--fg)]/5"
                                title="Llamar por teléfono"
                            >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)]">
                  <PhoneIcon className="h-5 w-5" />
                </span>
                                <div className="min-w-0">
                                    <div className="text-[13px] text-muted">Teléfono</div>
                                    <div className="text-[15px] font-semibold break-all">{PHONE_E164}</div>
                                </div>
                            </a>

                            {/* Email */}
                            <a
                                href={`mailto:${EMAIL}`}
                                className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--light-bg)] p-3 hover:bg-[var(--fg)]/5 sm:col-span-2"
                                title="Enviar correo"
                            >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)]">
                  <MailIcon className="h-5 w-5" />
                </span>
                                <div className="min-w-0">
                                    <div className="text-[13px] text-muted">Correo</div>
                                    <div className="text-[15px] font-semibold break-all">{EMAIL}</div>
                                </div>
                            </a>
                        </div>

                        {/* Redes sociales */}
                        <div className="mt-4">
                            <div className="text-sm font-semibold">Redes sociales</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {SOCIALS.map(({ name, href, icon: Icon }) => (
                                    <a
                                        key={name}
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--fg)]/5"
                                        title={name}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{name}</span>
                                    </a>
                                ))}
                            </div>
                            <p className="mt-2 text-[12px] text-muted">
                                *Actualiza los enlaces con tus URLs oficiales.*
                            </p>
                        </div>
                    </section>

                    {/* Visítanos */}
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <h2 className="text-base font-semibold">Visítanos</h2>
                        <p className="mt-2 text-sm text-muted">
                            Estamos en <span className="font-medium">{UBICACION_TXT}</span>. Puedes escribirnos por WhatsApp para
                            coordinar tu visita y brindarte atención prioritaria.
                        </p>
                    </section>
                </div>
            </div>
        </section>
    );
}
