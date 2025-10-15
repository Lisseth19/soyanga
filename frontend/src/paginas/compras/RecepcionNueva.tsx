import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useRecepcionData } from "@/hooks/useRecepcionData";
import { useAlmacenes } from "@/hooks/useAlmacenes";
import RecepcionHeader from "@/componentes/ui/RecepcionHeader";
import RecepcionItemsTable from "@/componentes/ui/RecepcionItemsTable";
import { recepcionesService } from "@/servicios/recepciones";
import { obtenerProveedor } from "@/servicios/proveedor";
import { monedaService } from "@/servicios/moneda";

/* ⬇⬇⬇ Helper robusto para resolver el CÓDIGO de la moneda */
async function resolverMonedaCodigo(idMoneda: number): Promise<string> {
    // 1) get directo
    try {
        const m = await monedaService.get(idMoneda);
        const code = (m?.codigo ?? "").toString().toUpperCase();
        if (code) return code;
    } catch {
        /* ignora y sigue */
    }

    // 2) listar y buscar por id
    try {
        const page = await monedaService.list({ activos: true, page: 0, size: 200, sort: "nombre,asc" });
        const found = page.content.find(x => x.idMoneda === idMoneda);
        const code = (found?.codigo ?? "").toString().toUpperCase();
        if (code) return code;
    } catch {
        /* ignora y sigue */
    }

    // 3) fallback local
    const fallback: Record<number, string> = { 1: "BS", 2: "USD" };
    return fallback[idMoneda] ?? String(idMoneda);
}

export default function RecepcionNuevaPage() {
    const { id } = useParams<{ id: string }>();
    const idCompra = Number(id);

    const { compra, lineas, setLinea, presMap, loading, error, totalRecibir } = useRecepcionData(idCompra);
    const { ops: almacenes } = useAlmacenes();

    const [proveedorLabel, setProveedorLabel] = useState<string>("");
    const [monedaLabel, setMonedaLabel] = useState<string>("");

    const [idAlmacen, setIdAlmacen] = useState<number>(0);
    const [fecha, setFecha] = useState<string>("");
    const [numeroDoc, setNumeroDoc] = useState("");
    const [obs, setObs] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!compra) return;

        // 1) Proveedor: usa el nombre si ya viene; si no, consulta el servicio.
        (async () => {
            if (compra.proveedor && String(compra.proveedor).trim() !== "") {
                setProveedorLabel(compra.proveedor!);
                return;
            }
            try {
                const prov = await obtenerProveedor(compra.idProveedor);
                const nombre =
                    (prov as any)?.razonSocial ||
                    (prov as any)?.nombreComercial ||
                    (prov as any)?.nombre ||
                    `#${compra.idProveedor}`;
                setProveedorLabel(nombre);
            } catch {
                setProveedorLabel(`#${compra.idProveedor}`);
            }
        })();

        // 2) Moneda: mostrar CÓDIGO (no símbolo)
        // Moneda (mostrar CÓDIGO)
        (async () => {
            const code = await resolverMonedaCodigo(compra.idMoneda);
            setMonedaLabel(code);
        })();
    }, [compra]);


    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        const items = lineas
            .filter(l => Number(l.cant) > 0)
            .map(l => ({
                idCompraDetalle: l.idCompraDetalle,
                idPresentacion: l.idPresentacion,
                cantidadRecibida: Number(l.cant),
                costoUnitarioMoneda: Number(l.costo),
                numeroLote: String(l.lote || "").trim(),
                fechaFabricacion: l.fab ? l.fab : null,
                fechaVencimiento: l.vence || "",
                observaciones: l.obs || null,
            }));

        if (!idAlmacen) return setErr("Selecciona un almacén");
        if (items.length === 0) return setErr("Agrega al menos una línea con cantidad > 0");
        if (items.some(i => !i.numeroLote)) return setErr("Todos los ítems deben tener N° de lote");
        if (items.some(i => !i.fechaVencimiento)) return setErr("Todos los ítems deben tener fecha de vencimiento");

        try {
            setSaving(true);
            await recepcionesService.crear({
                idCompra,
                idAlmacen,
                fechaRecepcion: fecha ? `${fecha}T00:00:00` : undefined,
                numeroDocumentoProveedor: numeroDoc || undefined,
                observaciones: obs || undefined,
                items,
            });
            window.location.href = `/compras/${idCompra}`;
        } catch (e: any) {
            setErr(e.message || "No se pudo registrar la recepción");
        } finally {
            setSaving(false);
        }
    }


    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold">Recepción de compra</h1>
                <Link
                    to={`/compras/${idCompra}`}
                    className="text-sm px-3 py-2 border rounded hover:bg-neutral-50 no-underline"
                >
                    ← Volver a la compra
                </Link>
            </div>

            {loading && <div>Cargando…</div>}
            {(error || err) && <div className="text-red-600 text-sm">{error || err}</div>}

            {/* Datos de la OC */}
            {compra && (
                <div className="rounded-lg border p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div><div className="text-neutral-500">Compra</div><div className="font-medium">#{compra.idCompra}</div></div>
                        <div><div className="text-neutral-500">Proveedor</div><div className="font-medium">{proveedorLabel || `#${compra.idProveedor}`}</div></div>
                        <div><div className="text-neutral-500">Fecha OC</div><div className="font-medium">{new Date(compra.fechaCompra).toLocaleDateString()}</div></div>
                        <div><div className="text-neutral-500">Moneda / TC</div><div className="font-medium">{monedaLabel} · {Number(compra.tipoCambioUsado).toFixed(4)}</div></div>
                    </div>
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
                <RecepcionHeader
                    almacenes={almacenes}
                    idAlmacen={idAlmacen}
                    setIdAlmacen={setIdAlmacen}
                    fecha={fecha}
                    setFecha={setFecha}
                    numeroDoc={numeroDoc}
                    setNumeroDoc={setNumeroDoc}
                    obs={obs}
                    setObs={setObs}
                />

                <RecepcionItemsTable lineas={lineas} presMap={presMap} setLinea={setLinea} />

                <div className="flex items-center justify-between">
                    <div className="text-sm text-neutral-600">
                        Total a recibir: <b>{totalRecibir.toFixed(3)}</b>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
                            disabled={saving || loading || totalRecibir <= 0}
                        >
                            Registrar recepción
                        </button>
                        <Link to={`/compras/${idCompra}`} className="px-4 py-2 border rounded-lg no-underline">
                            Cancelar
                        </Link>
                    </div>
                </div>

                <p className="text-xs text-neutral-500">
                    * El backend valida que no se sobre-recepcione por ítem (exceder lo pedido).
                </p>
            </form>
        </div>
    );
}
