import { useEffect, useMemo, useState } from "react";
import { ventasService } from "@/servicios/ventas";

const EMPRESA = {
    nombre: "SOYANGA S.A.",
    direccion: "Calle Ficticia 123, Ciudad, País",
    nit: "NIT: 123456789",
};

type AutoAction = "print" | "download" | undefined;

type Props = {
    idVenta: number;
    onClose?: () => void;
    /** Si viene, al cargar el comprobante se dispara automáticamente */
    auto?: AutoAction;
};

function fmt(n?: number | null) {
    return Number(n ?? 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtFecha(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const f = d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const h = d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
    return `${f} ${h}`;
}

export default function ComprobanteVenta({ idVenta, onClose, auto }: Props) {
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const d = await ventasService.detalle(idVenta);
                if (!alive) return;
                setData(d);
            } catch (e: any) {
                if (!alive) return;
                setErr(e?.message || "No se pudo cargar el comprobante.");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [idVenta]);

    const h = data?.header ?? data;
    const items = data?.items ?? data?.detalle ?? [];

    const tot = useMemo(() => {
        if (!h) return { bruto: 0, desc: 0, imp: 0, intPct: 0, intMonto: 0, netoImp: 0, totalFinal: 0 };
        const bruto = Number(h.totalBrutoBob ?? 0);
        const desc = Number(h.descuentoTotalBob ?? 0);
        const netoImp = Number(h.totalNetoBob ?? Math.max(0, bruto - desc));
        const imp = Math.max(0, netoImp - Math.max(0, bruto - desc));
        const intPct = String(h.condicionDePago).toLowerCase() === "credito" ? Number(h.interesCredito ?? 0) : 0;
        const intMonto = intPct > 0 ? (netoImp * intPct) / 100 : 0;
        const totalFinal = netoImp + intMonto;
        return { bruto, desc, imp, intPct, intMonto, netoImp, totalFinal };
    }, [h]);

    async function descargarPDF() {
        const el = document.getElementById("comprobante-venta");
        if (!el) return;
        const { default: html2pdf } = await import("html2pdf.js");
        const nombre = `${(h?.tipoDocumentoTributario || "DOC").toString().toUpperCase()}_${h?.numeroDocumento || h?.idVenta}.pdf`;
        await html2pdf()
            .from(el)
            .set({
                margin: 8,
                filename: nombre,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: "mm", format: "a5", orientation: "portrait" },
            })
            .save();
    }

    // Disparo automático si lo piden
    useEffect(() => {
        if (!auto || loading || !h) return;
        const t = setTimeout(() => {
            if (auto === "download") descargarPDF();
            if (auto === "print") window.print();
        }, 80);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, loading, h?.idVenta]);

    if (loading) return <div className="p-6 text-sm">Cargando comprobante…</div>;
    if (err) return <div className="p-6 text-sm text-rose-600">{err}</div>;
    if (!h) return null;

    return (
        <div className="w-full h-full">
            <div className="flex items-center justify-end gap-2 p-3 border-b bg-white sticky top-0 z-10 print:hidden">
                <button className="px-3 py-1.5 rounded border hover:bg-neutral-50" onClick={descargarPDF}>Descargar</button>
                <button className="px-3 py-1.5 rounded border hover:bg-neutral-50" onClick={() => window.print()}>Imprimir</button>
                <button className="px-3 py-1.5 rounded border hover:bg-neutral-50" onClick={onClose}>Cerrar</button>
            </div>

            <div className="flex justify-center p-4">
                <div id="comprobante-venta" className="w-[420px] bg-white rounded-lg shadow print:shadow-none border print:border-0 p-4">
                    <div className="text-center mb-3">
                        <div className="text-lg font-bold tracking-wide">{EMPRESA.nombre}</div>
                        <div className="text-[11px] text-neutral-700">{EMPRESA.direccion}</div>
                        <div className="text-[11px] text-neutral-700">{EMPRESA.nit}</div>
                    </div>

                    <div className="text-[12px] grid grid-cols-2 gap-y-1 border-y py-2 mb-3 font-mono">
                        <div>Venta #:</div><div className="text-right">{h.idVenta}</div>
                        <div>Número:</div><div className="text-right">{h.numeroDocumento || "—"}</div>
                        <div>Fecha:</div><div className="text-right">{fmtFecha(h.fechaVenta)}</div>
                        <div>Tipo:</div><div className="text-right">{String(h.tipoDocumentoTributario).toUpperCase()}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-[12px] font-semibold">CLIENTE</div>
                        <div className="text-[12px] font-mono">
                            {h.cliente || "-"}
                            {String(h.condicionDePago).toLowerCase() === "credito" && h.fechaVencimientoCredito && (
                                <div className="mt-1 text-[11px]">Vence: {fmtFecha(h.fechaVencimientoCredito)}</div>
                            )}
                        </div>
                    </div>

                    <div className="text-[12px] font-semibold mb-1">DETALLE</div>
                    <div className="rounded border">
                        <table className="w-full text-[12px] font-mono">
                            <thead className="bg-neutral-50">
                            <tr>
                                <th className="text-left px-2 py-1">Producto</th>
                                <th className="text-right px-2 py-1">Cant.</th>
                                <th className="text-right px-2 py-1">Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(items || []).map((it: any) => (
                                <tr key={it.idVentaDetalle ?? it.id ?? Math.random()} className="border-t">
                                    <td className="px-2 py-1">
                                        <div className="font-medium">{it.producto ?? it.productoNombre ?? "-"}</div>
                                        <div className="text-[10px] text-neutral-500">{it.sku ?? ""}</div>
                                    </td>
                                    <td className="px-2 py-1 text-right">{fmt(it.cantidad)}</td>
                                    <td className="px-2 py-1 text-right">{fmt(it.subtotalBob)}</td>
                                </tr>
                            ))}
                            {(!items || items.length === 0) && (
                                <tr><td colSpan={3} className="px-2 py-3 text-center text-neutral-500">(Sin ítems)</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 text-[12px] font-mono">
                        <div className="flex justify-between py-0.5"><span>Subtotal</span><span>{fmt(tot.bruto)}</span></div>
                        <div className="flex justify-between py-0.5"><span>Descuento</span><span>- {fmt(tot.desc)}</span></div>
                        {String(h.tipoDocumentoTributario).toLowerCase() === "factura" && (
                            <div className="flex justify-between py-0.5"><span>Impuesto</span><span>{fmt(tot.imp)}</span></div>
                        )}
                        {String(h.condicionDePago).toLowerCase() === "credito" && tot.intPct > 0 && (
                            <div className="flex justify-between py-0.5">
                                <span>Interés crédito ({tot.intPct.toFixed(2)}%)</span><span>{fmt(tot.intMonto)}</span>
                            </div>
                        )}
                        <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                            <span>TOTAL</span>
                            <span>{fmt(String(h.condicionDePago).toLowerCase() === "credito" ? tot.totalFinal : tot.netoImp)}</span>
                        </div>
                        <div className="mt-3 text-center text-[11px] text-neutral-600">
                            {String(h.condicionDePago).toLowerCase() === "credito" ? "VENTA A CRÉDITO" : "VENTA AL CONTADO"}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          html, body { background: white; }
          #comprobante-venta { box-shadow: none !important; border: 0 !important; }
        }
      `}</style>
        </div>
    );
}
