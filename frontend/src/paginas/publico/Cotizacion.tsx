// src/paginas/publico/Cotizacion.tsx
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "@/context/cart";
import type { CartItem } from "@/types/cart";

// PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo.png";

/** ===== Config ===== */
const WHATSAPP_NUMBER = "59169218189"; // sin "+"
const MONEDA = "Bs";
const NEGOCIO = "Soyanga";
const RAZON_SOCIAL = "Agroimportación Soyanga";
const UBICACION = "Santa Cruz, Bolivia";
const MAX_NOTAS = 220;
const MAX_NOMBRE = 80;

/** ===== Paleta ===== */
type RGB = [number, number, number];
const BRAND = {
    dark: [6, 78, 59] as RGB,        // #064E3B
    primary: [5, 150, 105] as RGB,   // #059669
    lettuce: [209, 250, 229] as RGB, // #D1FAE5
    ink: [17, 24, 39] as RGB,        // #111827
    gray: [100, 116, 139] as RGB,    // #64748B
    line: [229, 231, 235] as RGB,    // #E5E7EB
} as const;

/** ===== Utils ===== */
const money = (n: number) =>
    `${MONEDA} ${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

// Cargar logo como DataURL (si falla, seguimos sin logo)
async function tryLoadLogoDataURL(): Promise<string | null> {
    try {
        const resp = await fetch(logoUrl, { cache: "no-store" });
        if (!resp.ok) return null;
        const blob = await resp.blob();
        return await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/** ===== TEXTO WHATSAPP (incluye NOMBRE) ===== */
function crearMensajeWhatsAppMovil(
    items: CartItem[],
    total: number,
    opts: {
        nombre: string;
        saludo?: string;
        despedida?: string;
        notas?: string;
    }
) {
    const saludo =
        opts.saludo ??
        "Hola, solicito una *cotización* de las siguientes presentaciones. ¿Podrían confirmarme precio y disponibilidad, por favor?";
    const despedida =
        opts.despedida ?? "Quedo atento(a) a su confirmación. *Saludos cordiales*.";

    const lineas: string[] = [];

    // Encabezado
    lineas.push("🧾 *Agroimportación Soyanga — Solicitud de cotización*");
    lineas.push(`📍 ${UBICACION}`);
    lineas.push(`👤 *Nombre:* ${opts.nombre.trim()}`);
    lineas.push("");

    // Saludo
    lineas.push(saludo);
    lineas.push("");

    // Listado enumerado sin separador final
    items.forEach((it, i) => {
        const nombre = it.nombreProducto ?? `Producto #${it.idPresentacion}`;
        const cont = it.contenido ? ` - ${it.contenido}` : "";
        const unit = it.precioUnitBob ?? 0;
        const sub = unit * it.cantidad;

        lineas.push(`${i + 1}. *${nombre}${cont}*`);
        lineas.push(`   Cant: ${it.cantidad} × ${money(unit)} = *${money(sub)}*`);

        if (i < items.length - 1) {
            lineas.push("--------------------------------");
        }
    });

    // Total + Notas
    lineas.push("");
    lineas.push(`*TOTAL:* ${money(total)}`);
    if (opts.notas && opts.notas.trim()) {
        lineas.push(`*Notas:* ${opts.notas.trim()}`);
    }

    // Despedida
    lineas.push("");
    lineas.push(despedida);

    return lineas.join("\n");
}

/** ===== PDF profesional (incluye NOMBRE) ===== */
async function crearPdfCotizacion(opts: {
    items: CartItem[];
    total: number;
    notas?: string;
    clienteNombre: string;
}) {
    const { items, total, notas, clienteNombre } = opts;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48;

    const fecha = new Date();

    // Header
    const HEADER_H = 125; // si quieres más chico: 110 o 96
    doc.setFillColor(BRAND.dark[0], BRAND.dark[1], BRAND.dark[2]);
    doc.rect(0, 0, W, HEADER_H, "F");

    const logoData = await tryLoadLogoDataURL();
    if (logoData) {
        const size = 56;
        doc.addImage(logoData, "PNG", M, 36, size, size);
    }

    const textX = logoData ? M + 56 + 14 : M;
    const leftTitleY = 54;
    const leftSubY = leftTitleY + 24;

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(RAZON_SOCIAL, textX, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(UBICACION, textX, leftSubY);

    const rightTitleY = leftTitleY + 35;
    const rightDateY = rightTitleY + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(25);
    doc.text("COTIZACIÓN", W - M, rightTitleY, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
        `Fecha: ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`,
        W - M,
        rightDateY,
        { align: "right" }
    );

    // Cliente (nombre) — bajo la banda, antes de la tabla
    doc.setTextColor(BRAND.ink[0], BRAND.ink[1], BRAND.ink[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cliente", M, HEADER_H + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(clienteNombre.trim(), M + 54, HEADER_H + 14);

    // Tabla
    autoTable(doc, {
        startY: HEADER_H + 18 + 10, // un poco debajo del nombre
        head: [["#", "Producto / Presentación", "Cant.", "P. Unit", "Subtotal"]],
        body: items.map((it, i) => {
            const nombre = it.nombreProducto ?? `Producto #${it.idPresentacion}`;
            const cont = it.contenido ? ` – ${it.contenido}` : "";
            const unit = it.precioUnitBob ?? 0;
            const sub = unit * it.cantidad;
            return [
                String(i + 1),
                `${nombre}${cont}`,
                String(it.cantidad),
                `${MONEDA} ${unit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `${MONEDA} ${sub.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            ];
        }),
        theme: "striped",
        styles: {
            font: "helvetica",
            fontSize: 10,
            cellPadding: 8,
            lineColor: BRAND.line as any,
            lineWidth: 0.5,
        },
        headStyles: {
            fillColor: BRAND.primary as any,
            textColor: 255,
            fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: BRAND.lettuce as any },
        columnStyles: {
            0: { cellWidth: 28, halign: "right" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 54, halign: "right" },
            3: { cellWidth: 90, halign: "right" },
            4: { cellWidth: 100, halign: "right" },
        },
        margin: { left: M, right: M },
    });

    const afterTableY = (doc as any).lastAutoTable.finalY;

    // TOTAL (tarjeta)
    const totalBoxW = 320;
    const totalBoxH = 90;
    const totalBoxX = W - M - totalBoxW;
    const totalBoxY = afterTableY + 18;

    try {
        doc.setDrawColor(0, 0, 0);
        doc.setFillColor(0, 0, 0);
        // @ts-ignore
        doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.roundedRect(totalBoxX + 5, totalBoxY + 7, totalBoxW, totalBoxH, 10, 10, "F");
        // @ts-ignore
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
    } catch {}

    doc.setFillColor(BRAND.dark[0], BRAND.dark[1], BRAND.dark[2]);
    doc.setDrawColor(BRAND.dark[0], BRAND.dark[1], BRAND.dark[2]);
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, totalBoxH, 10, 10, "FD");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("TOTAL", totalBoxX + 16, totalBoxY + 30);
    doc.setFontSize(22);
    doc.text(
        `${MONEDA} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalBoxX + totalBoxW - 16,
        totalBoxY + 30,
        { align: "right" }
    );

    doc.setFillColor(BRAND.lettuce[0], BRAND.lettuce[1], BRAND.lettuce[2]);
    doc.roundedRect(totalBoxX, totalBoxY + totalBoxH - 26, totalBoxW, 26, 0, 0, "F");

    // NOTAS
    let nextY = totalBoxY + totalBoxH + 18;
    if (notas && notas.trim()) {
        const notesBoxW = W - M * 2;
        const notesText = doc.splitTextToSize(notas.trim().slice(0, MAX_NOTAS), notesBoxW - 24);
        const lineHeight = 14;
        const notesBoxH = Math.min(120, Math.max(52, 28 + notesText.length * lineHeight));

        doc.setDrawColor(BRAND.line[0], BRAND.line[1], BRAND.line[2]);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(M, nextY, notesBoxW, notesBoxH, 8, 8, "FD");

        doc.setTextColor(BRAND.ink[0], BRAND.ink[1], BRAND.ink[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Notas", M + 12, nextY + 22);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(BRAND.gray[0], BRAND.gray[1], BRAND.gray[2]);
        doc.setFontSize(10);
        doc.text(notesText, M + 12, nextY + 40, { maxWidth: notesBoxW - 24 });
        nextY += notesBoxH + 10;
    }

    // FOOTER
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.gray[0], BRAND.gray[1], BRAND.gray[2]);
    const footer =
        "Precios referenciales sujetos a stock. Validez: 7 días. — " +
        `${RAZON_SOCIAL} • ${UBICACION}`;
    doc.text(footer, M, H - 28);

    return doc.output("blob");
}

function descargarBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** ===== Página ===== */
export default function CotizacionPage() {
    const { items, totalBob, changeQty, removeItem, clear } = useCart();

    const [cantidadesDraft, setCantidadesDraft] = useState<Record<number, string>>({});
    const [nombre, setNombre] = useState("");
    const [notas, setNotas] = useState("");
    const notasCount = notas.length;

    // Confirmación (wa/pdf/clear)
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [justDid, setJustDid] = useState<"wa" | "pdf" | "clear" | null>(null);

    const pedirFinalizar = (tipo: "wa" | "pdf" | "clear") => {
        setJustDid(tipo);
        setConfirmOpen(true);
    };
    const finalizarCotizacion = () => {
        clear();
        setConfirmOpen(false);
        setJustDid(null);
    };

    const onChangeCantidad = (idPresentacion: number, raw: string) => {
        if (raw === "" || /^[0-9]+$/.test(raw)) {
            setCantidadesDraft((prev) => ({ ...prev, [idPresentacion]: raw }));
        }
    };
    const onBlurCantidad = (idPresentacion: number) => {
        const raw = cantidadesDraft[idPresentacion];
        const n = raw == null || raw === "" ? 1 : Math.max(1, parseInt(raw, 10));
        changeQty(idPresentacion, n);
        setCantidadesDraft((prev) => {
            const cp = { ...prev };
            delete cp[idPresentacion];
            return cp;
        });
    };
    const setDirect = (idPresentacion: number, val: number) => {
        const n = Math.max(1, val);
        setCantidadesDraft((prev) => ({ ...prev, [idPresentacion]: String(n) }));
        changeQty(idPresentacion, n);
    };
    const incrementar = (idPresentacion: number, actual: number) => {
        const draft = cantidadesDraft[idPresentacion];
        const base = draft == null ? actual : Number(draft || "0");
        setDirect(idPresentacion, (Number.isNaN(base) ? actual : base) + 1);
    };
    const decrementar = (idPresentacion: number, actual: number) => {
        const draft = cantidadesDraft[idPresentacion];
        const base = draft == null ? actual : Number(draft || "0");
        setDirect(idPresentacion, Math.max(1, (Number.isNaN(base) ? actual : base) - 1));
    };

    // Validación de nombre
    const nombreTrim = nombre.trim().slice(0, MAX_NOMBRE);
    const nombreValido = nombreTrim.length >= 3;

    // WhatsApp TEXT
    const waText = useMemo(() => {
        if (!items.length || !nombreValido) return "";
        const notasTrimmed = notas.trim().slice(0, MAX_NOTAS);
        return crearMensajeWhatsAppMovil(items, totalBob, {
            nombre: nombreTrim,
            notas: notasTrimmed || undefined,
            despedida: "Quedo atento(a) a su confirmación. *Saludos cordiales*.",
        });
    }, [items, totalBob, notas, nombreTrim, nombreValido]);

    const waHref = useMemo(() => {
        if (!waText) return "#";
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;
    }, [waText]);

    // Eventos
    const enviarPorWhatsApp = () => {
        if (!waText) return;
        window.open(waHref, "_blank");
        pedirFinalizar("wa");
    };

    const descargarPDF = async () => {
        if (!items.length || !nombreValido) return;
        const blob = await crearPdfCotizacion({
            items,
            total: totalBob,
            notas: notas.trim().slice(0, MAX_NOTAS) || undefined,
            clienteNombre: nombreTrim,
        });
        const filename = `Cotizacion-${NEGOCIO}-${new Date().toISOString().slice(0, 10)}.pdf`;
        descargarBlob(blob, filename);
        pedirFinalizar("pdf");
    };

    return (
        <section className="mx-auto max-w-7xl px-4 py-6">
            {/* Migas */}
            <nav className="mb-4 text-sm text-muted">
                <Link to="/soyanga/inicio" className="hover:underline">Inicio</Link>
                <span className="mx-2">/</span>
                <Link to="/soyanga/catalogo" className="hover:underline">Catálogo</Link>
                <span className="mx-2">/</span>
                <span className="text-[var(--fg)]/90">Cotización</span>
            </nav>

            {items.length === 0 ? (
                <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-muted">
                    Tu cotización está vacía.
                    <div className="mt-3">
                        <Link
                            to="/soyanga/catalogo"
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--fg)]/5"
                        >
                            Ir al catálogo
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                    {/* IZQUIERDA: Grilla de tarjetas */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        {/*
              - Móvil: 2 columnas
              - Desktop: 3 columnas
              - Las tarjetas NO se estiran: se limitan con max-w y se centran en su celda
            */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 justify-items-center">
                            {items.map((it) => {
                                const unit = it.precioUnitBob ?? 0;
                                const sub = unit * it.cantidad;
                                const draft = cantidadesDraft[it.idPresentacion] ?? String(it.cantidad);

                                return (
                                    <article
                                        key={it.idPresentacion}
                                        className="w-full max-w-[340px] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--light-bg)] overflow-hidden shadow-sm"
                                    >
                                        {/* Imagen */}
                                        <div className="relative">
                                            <div className="aspect-square w-full bg-black/10">
                                                {it.imagenUrl ? (
                                                    <img
                                                        src={it.imagenUrl}
                                                        alt={it.nombreProducto}
                                                        className="h-full w-full object-cover select-none"
                                                        loading="lazy"
                                                        decoding="async"
                                                        draggable={false}
                                                    />
                                                ) : (
                                                    <div className="h-full w-full grid place-items-center text-xs text-muted">Sin imagen</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeItem(it.idPresentacion)}
                                                className="absolute top-2 right-2 h-9 w-9 grid place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/90 hover:bg-rose-50 text-rose-600"
                                                title="Quitar"
                                                aria-label="Quitar"
                                            >
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-4 md:w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                                                    <path d="M10 11v6M14 11v6" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Cuerpo */}
                                        <div className="p-4 flex-1 flex flex-col gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[14px] font-semibold leading-tight line-clamp-2">
                                                    {it.nombreProducto}
                                                </div>
                                                <div className="text-xs text-muted line-clamp-1">{it.contenido || "—"}</div>
                                            </div>

                                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between">
                                                <span className="text-xs text-muted mb-1 md:mb-0">Precio unit.</span>
                                                <span className="text-[15px] font-semibold md:text-right">{money(unit)}</span>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs text-muted">Cantidad</span>
                                                <div className="w-full">
                                                    <div className="grid grid-cols-[32px_1fr_32px] md:grid-cols-[40px_1fr_40px] items-center gap-1">
                                                        <button
                                                            className="h-8 w-8 md:h-10 md:w-10 grid place-items-center rounded-lg border border-[var(--border)] hover:bg-[var(--fg)]/5"
                                                            onClick={() => decrementar(it.idPresentacion, it.cantidad)}
                                                            title="Disminuir"
                                                            aria-label="Disminuir"
                                                        >
                                                            <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M5 12h14" />
                                                            </svg>
                                                        </button>

                                                        <input
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-base"
                                                            value={draft}
                                                            onChange={(e) => onChangeCantidad(it.idPresentacion, e.target.value)}
                                                            onBlur={() => onBlurCantidad(it.idPresentacion)}
                                                            title="Cantidad"
                                                        />

                                                        <button
                                                            className="h-8 w-8 md:h-10 md:w-10 grid place-items-center rounded-lg border border-[var(--border)] hover:bg-[var(--fg)]/5"
                                                            onClick={() => incrementar(it.idPresentacion, it.cantidad)}
                                                            title="Aumentar"
                                                            aria-label="Aumentar"
                                                        >
                                                            <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M12 5v14M5 12h14" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between">
                                                <span className="text-xs text-muted mb-1 md:mb-0">Subtotal</span>
                                                <span className="text-[15px] font-bold md:text-right">{money(sub)}</span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>

                    {/* DERECHA: Resumen + acciones */}
                    <aside className="h-fit lg:sticky lg:top-20 lg:self-start rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="text-base font-semibold">Resumen</div>

                        {/* Nombre obligatorio */}
                        <div className="mt-3">
                            <label className="block text-xs text-muted mb-1">
                                Nombre completo <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                autoComplete="name"
                                maxLength={MAX_NOMBRE}
                                placeholder="Ej. Juan Pérez"
                                className={[
                                    "w-full rounded-lg px-3 py-2 text-sm",
                                    "placeholder:text-neutral-500", // placeholder legible
                                    nombreValido
                                        // estado válido → usa tu paleta normal
                                        ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
                                        // estado inválido (< 3 chars) → texto gris oscuro, fondo rosado suave
                                        : "border border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-1 focus:ring-rose-200 text-neutral-900"
                                ].join(" ")}
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                            {!nombreValido && (
                                <div className="mt-1 text-[12px] text-rose-600">
                                    Ingresa tu nombre (mín. 3 caracteres).
                                </div>
                            )}
                        </div>


                        {/* Notas con límite + contador */}
                        <div className="mt-3">
                            <label className="block text-xs text-muted mb-1">Notas (opcional)</label>
                            <textarea
                                rows={3}
                                maxLength={MAX_NOTAS}
                                placeholder="Ej. Enviar disponibilidad y tiempo estimado de entrega."
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                            />
                            <div className="mt-1 text-right text-[11px] text-muted">
                                {notasCount}/{MAX_NOTAS}
                            </div>
                        </div>

                        <div className="mt-3 border-t border-[var(--border)] pt-3 flex items-center justify-between">
                            <span className="text-sm font-semibold">Total</span>
                            <span className="text-lg font-bold">{money(totalBob)}</span>
                        </div>

                        <div className="mt-4 grid gap-2">
                            <button
                                onClick={enviarPorWhatsApp}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 ${
                                    !waText ? "pointer-events-none opacity-60" : ""
                                }`}
                                disabled={!waText}
                                title="Enviar texto por WhatsApp"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 32 32" aria-hidden="true">
                                    <path fill="currentColor" d="M19.11 17.59a3.86 3.86 0 0 1-1.25-.2c-.38-.13-.86-.45-1.49-.88a9.22 9.22 0 0 1-2.71-2.7c-.43-.64-.75-1.12-.88-1.51a3.72 3.72 0 0 1-.19-1.24 2 2 0 0 1 .63-1.49l.45-.45a.66.66 0 0 1 .47-.2h.35a.53.53 0 0 1 .38.13c.12.1.3.41.53.89l.18.39c.12.27.2.48.23.64a.89.89 0 0 1-.15.81l-.24.31a.44.44 0 0 0 0 .48c.14.24.43.6.86 1a8.21 8.21 0 0 0 1.26.9.44.44 0 0 0 .48 0l.31-.24a.89.89 0 0 1 .81-.15c.16 0 .37.11.64.23l.39.18c.48.23.79.41.89.53a.53.53 0 0 1 .13.38v.35a.66.66 0 0 1-.2.47l-.45.45a2 2 0 0 1-1.49.63Z"/>
                                    <path fill="currentColor" d="M27.1 4.9A13.94 13.94 0 0 0 16 1a14 14 0 0 0-12 21.15L2.67 31L11 27a14 14 0 0 0 16.1-22.1ZM16 25a11 11 0 1 1 11-11a11 11 0 0 1-11 11Z"/>
                                </svg>
                                Enviar por WhatsApp
                            </button>

                            <button
                                onClick={descargarPDF}
                                className={`rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--fg)]/5 ${
                                    !nombreValido ? "pointer-events-none opacity-60" : ""
                                }`}
                                title="Descargar PDF"
                                disabled={!nombreValido}
                            >
                                Descargar PDF
                            </button>

                            {/* Único botón para vaciar (con confirmación) */}
                            <button
                                onClick={() => pedirFinalizar("clear")}
                                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm"
                                title="Vaciar cotización"
                            >
                                Vaciar cotización
                            </button>

                            <Link
                                to="/soyanga/catalogo"
                                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-center hover:bg-[var(--fg)]/5"
                            >
                                Seguir viendo productos
                            </Link>
                        </div>
                    </aside>
                </div>
            )}

            {/* Modal: Confirmaciones */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-semibold">
                                {justDid === "clear" ? "¿Vaciar cotización?" : "¿Finalizar cotización?"}
                            </h3>
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="rounded-md border border-[var(--border)] px-2 py-1 text-sm hover:bg-[var(--fg)]/5"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="mt-2 text-sm text-muted">
                            {justDid === "wa" && "Acabamos de abrir WhatsApp con el mensaje listo. ¿Deseas finalizar y vaciar la cotización para crear una nueva?"}
                            {justDid === "pdf" && "Se generó y descargó el PDF de la cotización. ¿Deseas finalizar y vaciar la cotización para crear una nueva?"}
                            {justDid === "clear" && "Vas a vaciar tu cotización. Esta acción no se puede deshacer. ¿Deseas continuar?"}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--fg)]/5"
                            >
                                No, cancelar
                            </button>
                            <button
                                onClick={finalizarCotizacion}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
                            >
                                Sí, {justDid === "clear" ? "vaciar" : "finalizar"}
                            </button>
                        </div>

                        {justDid === "wa" && (
                            <p className="mt-3 text-[12px] text-muted">
                                Nota: los navegadores no permiten saber si el mensaje fue enviado efectivamente; por eso te preguntamos ahora.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
