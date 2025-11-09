import { useEffect, useMemo, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import {
    almacenService,
    type OpcionIdNombre,
    type PresentacionEnAlmacenDTO,
} from "@/servicios/almacen";
import type { AnticipoReservaDTO } from "@/types/anticipos";

// Selector de clientes (default export)
import ClienteElegir from "@/componentes/clientes/ClienteElegir";
// Picker de presentaciones por almacén
import PresenPorAlmacen from "@/componentes/anticipos/PresenPorAlmacen";

/* =============== helpers =============== */
type ClienteMini = { idCliente: number; razonSocialONombre?: string; nombre?: string };
const fmtMoney = (n?: number | null) =>
    new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

function ClienteElegirBridge({
                                 open,
                                 onClose,
                                 onPick,
                             }: {
    open: boolean;
    onClose: () => void;
    onPick: (c: ClienteMini) => void;
}) {
    const Comp: any = ClienteElegir as any;
    return (
        <Comp
            open={open}
            isOpen={open}
            visible={open}
            onClose={onClose}
            onDismiss={onClose}
            onCancel={onClose}
            onPick={onPick}
            onSelect={onPick}
            onChosen={onPick}
        />
    );
}

/* =============== Componente principal =============== */
export default function AnticipoCrearForm({
                                              onClose,
                                              onCreated,
                                          }: {
    onClose?: () => void;
    onCreated?: (idAnticipo: number) => void;
}) {
    // ---- Form
    const [cliente, setCliente] = useState<ClienteMini | null>(null);
    const [clienteInput, setClienteInput] = useState(""); // ingreso manual
    const [montoBob, setMontoBob] = useState("");
    const [obs, setObs] = useState("");

    // Validación sencilla (mensajes bajo inputs)
    const [touchedCliente, setTouchedCliente] = useState(false);
    const [touchedMonto, setTouchedMonto] = useState(false);

    // Switch: APAGADO por defecto
    const [asociarReserva, setAsociarReserva] = useState(false);

    // Estado de creación / id
    const [idAnticipo, setIdAnticipo] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    // Modales
    const [openCliente, setOpenCliente] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Almacenes & selección
    const [almacenes, setAlmacenes] = useState<OpcionIdNombre[]>([]);
    const [almacenId, setAlmacenId] = useState<number | "">("");

    // Ítems para reservar
    type PickItem = {
        idPresentacion: number;
        producto?: string;
        presentacion?: string | null;
        unidad?: string | null;
        sku?: string | null;
        precioBob?: number | null;
        cantidad: number;
    };
    const [picks, setPicks] = useState<PickItem[]>([]);

    useEffect(() => {
        almacenService
            .options({ soloActivos: true })
            .then(setAlmacenes)
            .catch(() => setAlmacenes([]));
    }, []);

    const totalReserva = useMemo(
        () => picks.reduce((acc, it) => acc + (Number(it.precioBob ?? 0) * Number(it.cantidad || 0)), 0),
        [picks]
    );

    function addFromPicker(p: PresentacionEnAlmacenDTO) {
        const id = Number(p.idPresentacion);
        setPicks((xs) => {
            const found = xs.find((it) => it.idPresentacion === id);
            if (found) return xs.map((it) => (it.idPresentacion === id ? { ...it, cantidad: it.cantidad + 1 } : it));
            return [
                ...xs,
                {
                    idPresentacion: id,
                    producto: p.producto ?? "",
                    presentacion: p.presentacion ?? null,
                    unidad: p.unidad ?? null,
                    sku: p.sku ?? null,
                    precioBob: typeof p.precioBob === "number" ? p.precioBob : null,
                    cantidad: 1,
                },
            ];
        });
    }

    function setQtyEntero(idPresentacion: number, raw: string) {
        const clean = raw.replace(/[^\d]/g, "");
        const n = clean === "" ? 0 : parseInt(clean, 10);
        setPicks((xs) => xs.map((it) => (it.idPresentacion === idPresentacion ? { ...it, cantidad: Math.max(0, n) } : it)));
    }

    function removePick(idPresentacion: number) {
        setPicks((xs) => xs.filter((it) => it.idPresentacion !== idPresentacion));
    }

    // ===== Validaciones
    const clienteOk = !!(cliente?.idCliente || clienteInput.trim().length > 0);
    const montoNum = Number((montoBob || "0").replace(",", "."));
    const montoOk = Number.isFinite(montoNum) && montoNum > 0;

    async function createIfNeeded(): Promise<number> {
        if (idAnticipo) return idAnticipo;

        if (!clienteOk) throw new Error("Ingrese el nombre del cliente o seleccione uno de la lista.");
        if (!montoOk) throw new Error("El monto debe ser mayor a 0.");

        const extraObs = !cliente?.idCliente && clienteInput.trim()
            ? `${obs ? obs + " — " : ""}(Cliente manual: ${clienteInput.trim()})`
            : obs;

        const res = await anticiposService.crear({
            idCliente: cliente?.idCliente ?? null, // backend lo acepta opcional
            montoBob: montoNum,
            observaciones: extraObs || undefined,
        });
        setIdAnticipo(res.idAnticipo);
        onCreated?.(res.idAnticipo);
        return res.idAnticipo;
    }

    async function handleGuardar() {
        try {
            setSaving(true);
            const id = await createIfNeeded();

            if (asociarReserva && picks.length > 0) {
                const idAlm = almacenId === "" ? null : Number(almacenId);
                if (!idAlm) throw new Error("Selecciona un almacén para la reserva.");
                const items = picks
                    .map((it) => ({ idPresentacion: it.idPresentacion, cantidad: Math.floor(Number(it.cantidad) || 0) }))
                    .filter((it) => it.idPresentacion > 0 && it.cantidad > 0);

                if (items.length === 0) throw new Error("Agrega al menos un producto con cantidad > 0.");

                const dto: AnticipoReservaDTO = { idAlmacen: idAlm, items };
                await anticiposService.reservar(id, dto);
            }

       //     alert(`Anticipo #${String(id).padStart(3, "0")} creado${asociarReserva && picks.length ? " con reserva" : ""}.`);
        } catch (e: any) {
            alert(e?.response?.data?.message || e?.message || "No se pudo guardar el anticipo.");
        } finally {
            setSaving(false);
        }
    }

    // Cerrar aunque no pasen onClose
    function closeSelf() {
        if (onClose) return onClose();
        if (typeof window !== "undefined") {
            if (window.history.length > 1) window.history.back();
            else window.location.assign("/anticipos");
        }
    }

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
            {/* contenedor ancho, alto limitado y body scrolleable */}
            <div className="w-[440px] md:w-[660px] lg:w-[720px] max-h-[90vh] rounded-xl bg-white shadow-lg border border-gray-200 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-200">
                    <p className="text-xl md:text-2xl font-bold leading-tight text-[#111417]">Nuevo Anticipo</p>
                    <button
                        onClick={closeSelf}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Cerrar"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body (scrolleable) */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 nice-scroll">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
                        {/* Cliente: manual + listar */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium pb-1.5 text-gray-700">Cliente</label>
                            <div className="flex items-center gap-2">
                                <input
                                    className={`form-input w-full h-11 rounded-lg border ${touchedCliente && !clienteOk ? "border-rose-400" : "border-gray-300"} bg-white px-3`}
                                    placeholder="Ingresar o seleccionar cliente"
                                    value={clienteInput}
                                    onChange={(e) => {
                                        setClienteInput(e.target.value);
                                        // si escribe manual, se desasocia el seleccionado
                                        if (cliente) setCliente(null);
                                    }}
                                    onBlur={() => setTouchedCliente(true)}
                                />
                                <button
                                    onClick={() => setOpenCliente(true)}
                                    className="h-11 px-4 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 whitespace-nowrap"
                                >
                                    Listar
                                </button>
                            </div>
                            <p className={`mt-1 text-xs ${touchedCliente && !clienteOk ? "text-rose-600" : "text-gray-500"}`}>
                                Obligatorio ingresar el nombre (o seleccionar de la lista).
                            </p>
                            {cliente?.idCliente && (
                                <p className="mt-1 text-xs text-emerald-600"></p>
                            )}
                        </div>

                        {/* Monto (más corto) */}
                        <div className="flex flex-col md:items-end">
                            <label className="text-sm font-medium pb-1.5 text-gray-700">Monto</label>
                            <div className="relative w-full md:max-w-[200px]">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">Bs</span>
                                <input
                                    className={`form-input w-full h-11 rounded-lg border ${touchedMonto && !montoOk ? "border-rose-400" : "border-gray-300"} bg-white pl-8 pr-3`}
                                    placeholder="0,00"
                                    value={montoBob}
                                    onChange={(e) => setMontoBob(e.target.value)}
                                    onBlur={() => setTouchedMonto(true)}
                                    inputMode="decimal"
                                />
                            </div>
                            <p className={`mt-1 text-xs ${touchedMonto && !montoOk ? "text-rose-600" : "text-gray-500"}`}>
                                El monto debe ser mayor a 0.
                            </p>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium pb-1.5 text-gray-700">Observaciones</label>
                        <textarea
                            className="form-textarea w-full min-h-24 rounded-lg border border-gray-300 bg-white p-3"
                            placeholder="Añadir un comentario..."
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                        />
                    </div>

                    {/* Switch reserva */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-gray-50">
                        <p className="text-base font-medium flex-1 truncate">¿Asociar reserva de productos?</p>
                        <label
                            className={`relative flex h-7 w-12 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 ${
                                asociarReserva ? "bg-emerald-600" : "bg-gray-200"
                            }`}
                        >
                            <div
                                className={`h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                                    asociarReserva ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                            <input
                                className="invisible absolute"
                                type="checkbox"
                                checked={asociarReserva}
                                onChange={(e) => setAsociarReserva(e.target.checked)}
                            />
                        </label>
                    </div>

                    {/* Reserva de productos (solo si está ON) */}
                    {asociarReserva && (
                        <ReservaBlock
                            almacenes={almacenes}
                            almacenId={almacenId}
                            setAlmacenId={setAlmacenId}
                            picks={picks}
                            setPicks={setPicks}
                            addFromPicker={addFromPicker}
                            setQtyEntero={setQtyEntero}
                            removePick={removePick}
                            totalReserva={totalReserva}
                            pickerOpen={pickerOpen}
                            setPickerOpen={setPickerOpen}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
                    <button
                        onClick={closeSelf}
                        className="min-w-28 h-11 px-6 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        disabled={saving}
                        className="min-w-28 h-11 px-6 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {saving ? "Guardando…" : "Guardar Anticipo"}
                    </button>
                </div>
            </div>

            {/* Modales secundarios */}
            {openCliente && (
                <ClienteElegirBridge
                    open={openCliente}
                    onClose={() => setOpenCliente(false)}
                    onPick={(c) => {
                        setCliente(c);
                        setClienteInput(c.razonSocialONombre ?? c.nombre ?? "");
                        setOpenCliente(false);
                    }}
                />
            )}

            <PresenPorAlmacen
                idAlmacen={almacenId === "" ? null : Number(almacenId)}
                abierto={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onPick={(p) => {
                    addFromPicker(p);
                    setPickerOpen(false);
                }}
            />

            {/* Scrollbar bonito */}
            <style>{`
        .nice-scroll::-webkit-scrollbar{width:10px;height:10px}
        .nice-scroll::-webkit-scrollbar-thumb{background:#c9ced6;border-radius:10px}
        .nice-scroll::-webkit-scrollbar-thumb:hover{background:#b5bbc4}
        .nice-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>
        </div>
    );
}

/* ======= Bloque de reserva (tabla + picker) ======= */
function ReservaBlock(props: {
    almacenes: OpcionIdNombre[];
    almacenId: number | "";
    setAlmacenId: (v: number | "") => void;
    picks: {
        idPresentacion: number;
        producto?: string;
        presentacion?: string | null;
        unidad?: string | null;
        sku?: string | null;
        precioBob?: number | null;
        cantidad: number;
    }[];
    setPicks: any;
    addFromPicker: (p: PresentacionEnAlmacenDTO) => void;
    setQtyEntero: (idPresentacion: number, raw: string) => void;
    removePick: (idPresentacion: number) => void;
    totalReserva: number;
    pickerOpen: boolean;
    setPickerOpen: (v: boolean) => void;
}) {
    const {
        almacenes,
        almacenId,
        setAlmacenId,
        picks,
        setQtyEntero,
        totalReserva,
        setPickerOpen,
    } = props;

    return (
        <div className="space-y-4 pt-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Reserva de Productos</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm w-full sm:w-64"
                        value={almacenId ?? ""}
                        onChange={(e) => setAlmacenId(e.target.value ? Number(e.target.value) : "")}
                    >
                        <option value="">Seleccionar almacén</option>
                        {almacenes.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.nombre}
                            </option>
                        ))}
                    </select>

                    <button
                        className="h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                        onClick={() => setPickerOpen(true)}
                        disabled={!almacenId}
                    >
                        Agregar Productos
                    </button>
                </div>
            </div>

            {/* Tabla con scroll vertical bonito */}
            <div className="rounded-lg border border-gray-200">
                <div className="max-h-64 overflow-y-auto nice-scroll">
                    <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="p-3 font-medium">Producto</th>
                            <th className="p-3 font-medium text-center">Cantidad</th>
                            <th className="p-3 font-medium text-right">Precio Unitario</th>
                            <th className="p-3 font-medium text-right">Subtotal</th>
                            <th className="p-3 w-12" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {picks.length === 0 ? (
                            <tr>
                                <td className="p-4 text-gray-500" colSpan={5}>
                                    Sin productos reservados.
                                </td>
                            </tr>
                        ) : (
                            picks.map((it) => {
                                const nombre =
                                    (it.producto ?? "Producto") +
                                    (it.presentacion ? ` · ${it.presentacion}` : "") +
                                    (it.unidad ? ` (${it.unidad})` : "");
                                const subtotal = (it.precioBob ?? 0) * (it.cantidad ?? 0);
                                return (
                                    <tr key={it.idPresentacion} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-900 font-medium">{nombre}</td>
                                        <td className="p-3 text-center">
                                            <input
                                                className="form-input w-20 rounded-md border border-gray-300 bg-white text-center text-sm"
                                                value={String(it.cantidad)}
                                                onChange={(e) => setQtyEntero(it.idPresentacion, e.target.value)}
                                                inputMode="numeric"
                                                pattern="\d*"
                                            />
                                        </td>
                                        <td className="p-3 text-right text-gray-600">
                                            {typeof it.precioBob === "number" ? `Bs ${fmtMoney(it.precioBob)}` : "—"}
                                        </td>
                                        <td className="p-3 text-right text-gray-900 font-medium">Bs {fmtMoney(subtotal)}</td>
                                        <td className="p-3">
                                            <button
                                                className="text-gray-500 hover:text-rose-600"
                                                title="Quitar"
                                                onClick={() => props.removePick(it.idPresentacion)}
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {picks.length > 0 && (
                <div className="flex justify-end items-center gap-3">
                    <span className="text-lg md:text-xl font-semibold text-gray-900">Total:</span>
                    <span className="text-xl md:text-2xl font-bold text-emerald-600">Bs {fmtMoney(totalReserva)}</span>
                </div>
            )}
        </div>
    );
}
