// src/paginas/ventas/VentaNueva.tsx
import { useEffect, useMemo, useState } from "react";
import { ventasService } from "@/servicios/ventas";
import type { VentaCrearDTO, CondicionPago, MetodoPago, TipoDocumentoTributario } from "@/types/ventas";
import { almacenService, type OpcionIdNombre } from "@/servicios/almacen";

// Pickers
import { ClientePickerDialog, type ClienteLite } from "@/componentes/clientes/ClientePickerDialog";
import { ImpuestoPickerDialog, type ImpuestoLite } from "@/componentes/impuestos/ImpuestoPickerDialog";
import { PresentacionPickerDialog, type PresentacionLite } from "@/componentes/ventas/PresentacionPickerDialog";

// Item del formulario
type ItemRow = {
    idPresentacion: number | null;
    sku?: string | null;
    producto?: string | null;
    cantidad: number;
    precioUnitarioBob?: number | null;
    descuentoPorcentaje?: number | null;
    descuentoMontoBob?: number | null;
    // opcional visual:
    imagenUrl?: string | null;
    lote?: string | null;
};

const hoyISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VentaNueva({ onClose, onCreated }: { onClose?: () => void; onCreated?: (idVenta: number) => void }) {
    // ===== Combos / datos base =====
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    useEffect(() => {
        almacenService.options().then(setAlmacenes).catch(() => setAlmacenes([]));
    }, []);

    // ===== Estado general =====
    const [idCliente, setIdCliente] = useState<number | null>(null);
    const [clienteNombre, setClienteNombre] = useState<string>("");

    const [tipoDoc, setTipoDoc] = useState<TipoDocumentoTributario>("boleta");
    const [condicion, setCondicion] = useState<CondicionPago>("contado");
    const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
    const [idAlmacen, setIdAlmacen] = useState<number | null>(null);
    const [fechaVenc, setFechaVenc] = useState<string>("");
    const [obs, setObs] = useState<string>("");

    // 👇 Impuesto (solo si factura)
    const [impuestoSel, setImpuestoSel] = useState<ImpuestoLite | null>(null);
    const [impPickerOpen, setImpPickerOpen] = useState(false);

    // 👇 Interés (solo si crédito, opcional) — porcentaje
    const [interesCredito, setInteresCredito] = useState<string>("");

    // Ítems
    const [items, setItems] = useState<ItemRow[]>([
        { idPresentacion: null, cantidad: 1, precioUnitarioBob: null, descuentoPorcentaje: null, descuentoMontoBob: null },
    ]);

    // Dialogs
    const [cliPickerOpen, setCliPickerOpen] = useState(false);
    const [presPickerOpen, setPresPickerOpen] = useState<null | number>(null); // index del item a editar con picker

    // Efectos de conveniencia
    useEffect(() => {
        if (condicion === "credito" && !fechaVenc) {
            const d = new Date(); d.setMonth(d.getMonth() + 1); // +1 mes por defecto (puedes ajustar)
            setFechaVenc(d.toISOString().slice(0, 10));
        }
        if (condicion === "contado") {
            setFechaVenc("");
            setInteresCredito(""); // opcional: limpiar
        }
    }, [condicion]);

    useEffect(() => {
        // Si cambia de factura -> boleta, limpiar impuesto
        if (tipoDoc !== "factura") setImpuestoSel(null);
    }, [tipoDoc]);

    // Helpers de items
    function setItem(idx: number, patch: Partial<ItemRow>) {
        setItems(arr => {
            const next = [...arr];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    }
    function addRow() {
        setItems(arr => [...arr, { idPresentacion: null, cantidad: 1, precioUnitarioBob: null, descuentoPorcentaje: null, descuentoMontoBob: null }]);
    }
    function removeRow(idx: number) {
        setItems(arr => arr.filter((_, i) => i !== idx));
    }

    // ===== Cálculo de totales (preview) =====
    const tot = useMemo(() => {
        let bruto = 0;
        let descTotal = 0;

        for (const it of items) {
            const pu = Number(it.precioUnitarioBob ?? 0) || 0;
            const cant = Number(it.cantidad || 0);
            const lineaBruto = pu * cant;
            const dPct = Number(it.descuentoPorcentaje ?? 0) || 0;
            const dMonto = Number(it.descuentoMontoBob ?? 0) || 0;

            const descPctMonto = lineaBruto * (dPct / 100);
            const descLinea = Math.min(lineaBruto, Math.max(0, descPctMonto + dMonto));

            bruto += lineaBruto;
            descTotal += descLinea;
        }

        const netoBase = Math.max(0, bruto - descTotal);

        // impuesto (si factura)
        const impPct = tipoDoc === "factura" && impuestoSel ? Number(impuestoSel.porcentaje || 0) : 0;
        const impMonto = netoBase * (impPct / 100);
        const conImpuesto = netoBase + impMonto;

        // interés (si crédito)
        const intPct = condicion === "credito" ? Number(interesCredito || 0) : 0;
        const intMonto = conImpuesto * (intPct / 100);

        const totalNeto = conImpuesto + intMonto ;

        return {
            bruto,
            descTotal,
            impPct,
            impMonto,
            intPct,
            intMonto,
            totalNeto,
        };
    }, [items, tipoDoc, impuestoSel, condicion, interesCredito]);

    // ====== Submit ======
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        // Validaciones:
        if (!idAlmacen) {
            setErr("Selecciona Almacén de despacho.");
            return;
        }
        if (items.filter(i => i.idPresentacion && i.cantidad > 0).length === 0) {
            setErr("Agrega al menos un ítem de venta.");
            return;
        }
        if (tipoDoc === "factura") {
            if (!idCliente || idCliente <= 0) {
                setErr("Para facturas, el cliente es obligatorio.");
                return;
            }
            if (!impuestoSel) {
                setErr("Para facturas, debes seleccionar un impuesto.");
                return;
            }
        }
        if (condicion === "credito" && !fechaVenc) {
            setErr("Para crédito, la fecha de vencimiento es obligatoria.");
            return;
        }

        // DTO a backend (el backend aplica los cálculos reales)
        const dto: VentaCrearDTO = {
            idCliente: idCliente ?? undefined,
            tipoDocumentoTributario: tipoDoc,
            condicionDePago: condicion,
            fechaVencimientoCredito: condicion === "credito" ? (fechaVenc || null) : null,
            idAlmacenDespacho: idAlmacen!,
            metodoDePago: metodo,
            observaciones: obs || null,
            impuestoId: tipoDoc === "factura" ? (impuestoSel?.id ?? null) : null,
            // porcentaje de interés (opcional)
            interesCredito: condicion === "credito" && interesCredito.trim() !== "" ? Number(interesCredito) : null,
            items: items
                .filter(it => it.idPresentacion && it.cantidad > 0)
                .map(it => ({
                    idPresentacion: it.idPresentacion!,
                    cantidad: Number(it.cantidad),
                    precioUnitarioBob: it.precioUnitarioBob ?? undefined,
                    descuentoPorcentaje: it.descuentoPorcentaje ?? undefined,
                    descuentoMontoBob: it.descuentoMontoBob ?? undefined,
                })),
        };

        try {
            setSaving(true);
            const res = await ventasService.crear(dto);
            onCreated?.(res.idVenta);
            onClose?.();
        } catch (e: any) {
            setErr(e?.message || "No se pudo crear la venta.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="bg-white rounded-xl p-4">
            <form onSubmit={onSubmit} className="space-y-6">
                <h3 className="text-lg font-semibold">Nueva Venta</h3>

                {/* Datos generales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cliente */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Cliente</label>
                        <div className="flex gap-2">
                            <input
                                className="border rounded px-3 py-2 w-full"
                                placeholder={tipoDoc === "factura" ? "Obligatorio para factura…" : "Opcional"}
                                value={clienteNombre}
                                onChange={(e) => {
                                    setClienteNombre(e.target.value);
                                    setIdCliente(null);
                                }}
                            />
                            <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => setCliPickerOpen(true)}>
                                Lista
                            </button>
                        </div>
                        {idCliente
                            ? <div className="text-xs text-emerald-700">Seleccionado (ID: {idCliente})</div>
                            : <div className="text-xs text-neutral-500">Sin selección</div>}
                    </div>

                    {/* Tipo documento */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Tipo de Documento</label>
                        <select
                            className="border rounded px-3 py-2 w-full"
                            value={tipoDoc}
                            onChange={(e) => setTipoDoc(e.target.value as TipoDocumentoTributario)}
                        >
                            <option value="boleta">Boleta</option>
                            <option value="factura">Factura</option>
                        </select>
                    </div>

                    {/* Condición + vencimiento */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Condición de Pago</label>
                        <select
                            className="border rounded px-3 py-2 w-full"
                            value={condicion}
                            onChange={(e) => setCondicion(e.target.value as CondicionPago)}
                        >
                            <option value="contado">Contado</option>
                            <option value="credito">Crédito</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Fecha Vencimiento</label>
                        <input
                            type="date"
                            disabled={condicion !== "credito"}
                            className="border rounded px-3 py-2 w-full disabled:opacity-50"
                            value={fechaVenc}
                            onChange={(e) => setFechaVenc(e.target.value)}
                        />
                    </div>

                    {/* Método + Almacén */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Método de Pago</label>
                        <select
                            className="border rounded px-3 py-2 w-full"
                            value={metodo}
                            onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                        >
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="mixto">Mixto</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Almacén de Despacho</label>
                        <select
                            className="border rounded px-3 py-2 w-full"
                            value={idAlmacen ?? ""}
                            onChange={(e) => setIdAlmacen(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">Seleccione…</option>
                            {almacenes.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Observaciones */}
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium">Observaciones</label>
                        <textarea
                            className="border rounded px-3 py-2 w-full"
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* 👇 BLOQUE IMPUESTO (SOLO FACTURA) */}
                    {tipoDoc === "factura" && (
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Impuesto</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    className="border rounded px-3 py-2 w-full"
                                    value={impuestoSel ? `${impuestoSel.nombre} (${Number(impuestoSel.porcentaje).toFixed(2)}%)` : ""}
                                    placeholder="Selecciona un impuesto…"
                                    readOnly
                                />
                                <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => setImpPickerOpen(true)}>
                                    Seleccionar
                                </button>
                                {impuestoSel && (
                                    <button
                                        type="button"
                                        className="px-3 py-2 border rounded text-sm"
                                        onClick={() => setImpuestoSel(null)}
                                        title="Quitar impuesto"
                                    >
                                        Quitar
                                    </button>
                                )}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                                El impuesto se aplicará al total en el backend al confirmar la factura.
                            </div>
                        </div>
                    )}

                    {/* 👇 INTERÉS (SOLO CRÉDITO, OPCIONAL, %) */}
                    {condicion === "credito" && (
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Interés (opcional, %)</label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="border rounded px-3 py-2 w-full"
                                placeholder="0.00"
                                value={interesCredito}
                                onChange={(e) => setInteresCredito(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Ítems */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Ítems</h4>
                        <button type="button" className="text-emerald-700 hover:underline" onClick={addRow}>+ Agregar ítem</button>
                    </div>

                    <div className="space-y-2">
                        {items.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                {/* Producto/presentación + listar */}
                                <div className="md:col-span-4">
                                    <label className="text-sm">Presentación / Producto</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="border rounded px-3 py-2 w-full"
                                            readOnly
                                            value={it.producto ? `${it.producto}${it.sku ? " · " + it.sku : ""}` : ""}
                                            placeholder="Selecciona desde la lista…"
                                        />
                                        <button
                                            type="button"
                                            className="px-3 py-2 border rounded text-sm"
                                            onClick={() => setPresPickerOpen(idx)}
                                        >
                                            Lista
                                        </button>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-sm">Cantidad</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="1"
                                        className="border rounded px-3 py-2 w-full"
                                        value={it.cantidad}
                                        onChange={(e) => setItem(idx, { cantidad: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-sm">P. Unitario</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="border rounded px-3 py-2 w-full"
                                        value={it.precioUnitarioBob ?? ""}
                                        onChange={(e) => setItem(idx, { precioUnitarioBob: e.target.value ? Number(e.target.value) : null })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-sm">Desc. %</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="border rounded px-3 py-2 w-full"
                                        value={it.descuentoPorcentaje ?? ""}
                                        onChange={(e) => setItem(idx, { descuentoPorcentaje: e.target.value ? Number(e.target.value) : null })}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-sm">Desc. Bs</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="border rounded px-3 py-2 w-full"
                                        value={it.descuentoMontoBob ?? ""}
                                        onChange={(e) => setItem(idx, { descuentoMontoBob: e.target.value ? Number(e.target.value) : null })}
                                    />
                                </div>

                                <div className="md:col-span-1 text-right">
                                    <button type="button" className="px-3 py-2 border rounded" onClick={() => removeRow(idx)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totales + acciones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="md:col-span-2" />
                    <div className="border rounded-xl p-4">
                        <div className="font-semibold mb-2">Totales</div>
                        <div className="flex justify-between py-1 text-sm">
                            <span className="text-neutral-600">Total bruto</span>
                            <span>{fmt(tot.bruto)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-sm">
                            <span className="text-neutral-600">Descuento total</span>
                            <span>- {fmt(tot.descTotal)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-sm">
                            <span className="text-neutral-600">Impuesto {tot.impPct ? `(${tot.impPct.toFixed(2)}%)` : ""}</span>
                            <span>{fmt(tot.impMonto)}</span>
                        </div>
                        {condicion === "credito" && (
                            <div className="flex justify-between py-1 text-sm">
                                <span className="text-neutral-600">Interés {tot.intPct ? `(${tot.intPct.toFixed(2)}%)` : ""}</span>
                                <span>{fmt(tot.intMonto)}</span>
                            </div>
                        )}
                        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                            <span>Total neto</span>
                            <span className="text-emerald-700">{fmt(tot.totalNeto)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                    <button type="button" className="px-4 py-2 border rounded" onClick={onClose}>Cancelar</button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {saving ? "Guardando…" : "Guardar venta"}
                    </button>
                </div>

                {err && <div className="text-rose-600">{err}</div>}
            </form>

            {/* Dialogs */}
            {cliPickerOpen && (
                <ClientePickerDialog
                    onClose={() => setCliPickerOpen(false)}
                    onPick={(c: ClienteLite) => {
                        setClienteNombre(c.nombre);
                        setIdCliente(c.idCliente);
                        setCliPickerOpen(false);
                    }}
                />
            )}

            {impPickerOpen && (
                <ImpuestoPickerDialog
                    onClose={() => setImpPickerOpen(false)}
                    onPick={(imp: ImpuestoLite) => {
                        setImpuestoSel(imp);
                        setImpPickerOpen(false);
                    }}
                />
            )}

            {presPickerOpen !== null && (
                <PresentacionPickerDialog
                    onClose={() => setPresPickerOpen(null)}
                    onPick={(p: PresentacionLite) => {
                        // autocompletar ítem
                        setItem(presPickerOpen!, {
                            idPresentacion: p.idPresentacion,
                            sku: p.sku,
                            producto: p.producto,
                            precioUnitarioBob: p.precioVentaBob ?? null,
                            imagenUrl: p.imagenUrl ?? null,
                        });
                        setPresPickerOpen(null);
                    }}
                />
            )}
        </div>
    );
}
