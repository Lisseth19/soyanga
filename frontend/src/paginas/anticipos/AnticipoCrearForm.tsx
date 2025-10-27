import { useEffect, useMemo, useRef, useState } from "react";
import { anticiposService } from "@/servicios/anticipos";
import type { AnticipoCrearDTO } from "@/types/anticipos";

// servicio de clientes (SINGULAR, según tu proyecto)
import { ClienteService } from "../../servicios/cliente";

// diálogo “Lista de clientes” (Forma 2)
import { ClientePickerDialog } from "../../componentes/clientes/ClientePickerDialog";

// ---- helpers ----
type ClienteLite = { idCliente: number; nombre: string; nit?: string | null };

function toClienteLite(c: any): ClienteLite {
    const id = c?.id ?? c?.idCliente;
    const nombre =
        c?.razonSocialONombre ?? c?.razonSocial ?? c?.nombreCliente ?? c?.nombre ?? "";
    const nit = c?.nit ?? c?.nroDocumento ?? null;
    return { idCliente: Number(id ?? 0), nombre: String(nombre), nit };
}

function normalizeTxt(s: string) {
    return (s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function useDebounced<T>(value: T, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

export function AnticipoCrearForm({
                                      defaultClienteId,
                                      onCreated,
                                      onCancel,
                                  }: {
    defaultClienteId?: number;
    onCreated?: (idAnticipo: number) => void;
    onCancel?: () => void;
}) {
    // ===== estado del DTO =====
    const [form, setForm] = useState<AnticipoCrearDTO>({
        idCliente: defaultClienteId ?? 0,
        montoBob: 0,
        observaciones: "",
    });

    // ===== estados UI =====
    const [clienteNombre, setClienteNombre] = useState<string>("");
    const [montoInput, setMontoInput] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [errGeneral, setErrGeneral] = useState<string | null>(null);
    const [errCliente, setErrCliente] = useState<string | null>(null);
    const [errMonto, setErrMonto] = useState<string | null>(null);

    // Forma 2: abrir/cerrar lista
    const [pickerOpen, setPickerOpen] = useState(false);

    // ---- Autocomplete (Forma 1) ----
    const [sugOpen, setSugOpen] = useState(false);
    const [sugLoading, setSugLoading] = useState(false);
    const [sugs, setSugs] = useState<ClienteLite[]>([]);
    const debouncedNombre = useDebounced(clienteNombre, 250);

    // Precargar nombre si llega defaultClienteId
    useEffect(() => {
        (async () => {
            if (defaultClienteId && defaultClienteId > 0) {
                try {
                    const r = await ClienteService.obtener(defaultClienteId);
                    const nombre =
                        (r as any)?.razonSocialONombre ??
                        (r as any)?.razonSocial ??
                        (r as any)?.nombreCliente ??
                        (r as any)?.nombre ??
                        String(defaultClienteId);
                    setClienteNombre(nombre);
                } catch {
                    /* silencioso */
                }
            }
        })();
    }, [defaultClienteId]);

    // Monto manual (string -> número, sin negativos)
    useEffect(() => {
        const txt = montoInput.replace(",", ".");
        const num = parseFloat(txt);
        setForm((s) => ({
            ...s,
            montoBob: Number.isFinite(num) ? Math.max(0, num) : 0,
        }));
    }, [montoInput]);

    // === Autoresolver mientras escribes (Forma 1) ===
    useEffect(() => {
        let cancel = false;
        (async () => {
            const q = debouncedNombre?.trim();
            if (!q || q.length < 2) {
                if (!cancel) {
                    setSugs([]);
                    setSugOpen(false);
                }
                return;
            }
            try {
                setSugLoading(true);
                const page = await ClienteService.listar({
                    q,
                    page: 0,
                    size: 8,
                    soloActivos: true,
                    sort: "razonSocialONombre,asc",
                });
                if (cancel) return;

                const list: ClienteLite[] = (page as any)?.content?.map(toClienteLite) ?? [];
                setSugs(list);

                // Autoselección: coincidencia exacta o único resultado
                const qN = normalizeTxt(q);
                const exact = list.find((c) => normalizeTxt(c.nombre) === qN);

                if (exact) {
                    seleccionarCliente(exact);
                    setSugOpen(false);
                    return;
                }
                if (list.length === 1) {
                    seleccionarCliente(list[0]);
                    setSugOpen(false);
                    return;
                }

                // Varias coincidencias -> mostrar dropdown
                setSugOpen(list.length > 0);
            } catch {
                if (!cancel) {
                    setSugs([]);
                    setSugOpen(false);
                }
            } finally {
                if (!cancel) setSugLoading(false);
            }
        })();
        return () => {
            cancel = true;
        };
    }, [debouncedNombre]);

    function seleccionarCliente(c: ClienteLite) {
        setClienteNombre(c.nombre);
        setForm((s) => ({ ...s, idCliente: c.idCliente }));
        setErrCliente(null);
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrGeneral(null);
        setErrCliente(null);
        setErrMonto(null);

        if (!form.idCliente || form.idCliente <= 0) {
            setErrCliente("Selecciona un cliente (puedes usar la Lista).");
            return;
        }
        if (!montoInput || form.montoBob <= 0) {
            setErrMonto("El monto debe ser mayor a 0.");
            return;
        }

        try {
            setLoading(true);
            const r = await anticiposService.crear({
                idCliente: form.idCliente,
                montoBob: form.montoBob,
                observaciones: form.observaciones,
            });
            onCreated?.(r.idAnticipo);
        } catch (e: any) {
            setErrGeneral(e?.message ?? "No se pudo crear el anticipo");
        } finally {
            setLoading(false);
        }
    }

    // Cerrar modal al click afuera / ESC
    const panelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        function handleDown(ev: MouseEvent | PointerEvent) {
            const el = panelRef.current;
            if (!el) return;
            const target = ev.target as Node;
            if (!el.contains(target)) onCancel?.();
        }
        function handleEsc(ev: KeyboardEvent) {
            if (ev.key === "Escape") onCancel?.();
        }
        document.addEventListener("pointerdown", handleDown);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("pointerdown", handleDown);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [onCancel]);


    const isValid = form.idCliente > 0 && form.montoBob > 0 && !loading;

    // Render de sugerencias (Forma 1)
    const sugsRender = useMemo(
        () =>
            sugs.map((c) => (
                <li
                    key={c.idCliente}
                    className="px-3 py-2 hover:bg-emerald-50 cursor-pointer"
                    onMouseDown={(ev) => {
                        // onMouseDown para seleccionar antes de que el input pierda foco
                        ev.preventDefault();
                        seleccionarCliente(c);
                        setSugOpen(false);
                    }}
                >
                    <div className="text-sm font-medium">{c.nombre}</div>
                    {c.nit && <div className="text-xs text-neutral-500">NIT: {c.nit}</div>}
                </li>
            )),
        [sugs]
    );

    return (
        <div ref={panelRef} className="bg-white rounded-xl shadow-xl p-4 w-full max-w-lg">
            <form onSubmit={submit} className="space-y-4">
                <h3 className="text-lg font-semibold">Nuevo anticipo</h3>

                {/* CLIENTE: Forma 1 (manual con autocompletar) + Forma 2 (Lista) */}
                <div className="space-y-1">
                    <label className="text-sm font-medium">Cliente</label>
                    <div className="relative">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={clienteNombre}
                                onChange={(e) => {
                                    setClienteNombre(e.target.value);
                                    // si reescribe, invalida selección
                                    setForm((s) => ({ ...s, idCliente: 0 }));
                                }}
                                onFocus={() => {
                                    if (sugs.length > 0) setSugOpen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && sugOpen && sugs.length > 0) {
                                        e.preventDefault();
                                        seleccionarCliente(sugs[0]);
                                        setSugOpen(false);
                                    }
                                }}
                                onBlur={() => {
                                    // al salir, si coincide exacto con alguna sugerencia, selecciona
                                    if (form.idCliente <= 0 && sugs.length > 0) {
                                        const exact = sugs.find(
                                            (c) => normalizeTxt(c.nombre) === normalizeTxt(clienteNombre)
                                        );
                                        if (exact) seleccionarCliente(exact);
                                    }
                                    setSugOpen(false);
                                }}
                                placeholder="Escribe el nombre o usa la Lista"
                                className="border rounded px-3 py-2 w-full"
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className="px-3 py-2 border rounded text-sm hover:bg-neutral-50"
                                onClick={() => setPickerOpen(true)}
                                title="Abrir lista de clientes"
                            >
                                Lista
                            </button>
                        </div>

                        {/* Dropdown de sugerencias (Forma 1) */}
                        {sugOpen && (
                            <ul className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
                                {sugLoading && (
                                    <li className="px-3 py-2 text-sm text-neutral-500">Buscando…</li>
                                )}
                                {!sugLoading && sugs.length === 0 && (
                                    <li className="px-3 py-2 text-sm text-neutral-500">Sin coincidencias</li>
                                )}
                                {!sugLoading && sugs.length > 0 && sugsRender}
                            </ul>
                        )}
                    </div>

                    {form.idCliente > 0 ? (
                        <div className="text-xs text-emerald-700">
                            Cliente seleccionado (ID: {form.idCliente})
                        </div>
                    ) : (
                        <div className="text-xs text-neutral-500">Sin cliente seleccionado</div>
                    )}

                    {errCliente && <p className="text-red-600 text-xs">{errCliente}</p>}
                </div>

                {/* MONTO */}
                <div className="space-y-1">
                    <label className="text-sm font-medium">Monto (BOB)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]+([.,][0-9]{1,2})?"
                        placeholder="0.00"
                        value={montoInput}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (/^[0-9]*([.,][0-9]{0,2})?$/.test(v) || v === "") setMontoInput(v);
                        }}
                        onKeyDown={(e) => {
                            if (["e", "E", "+", "-", "ArrowUp", "ArrowDown"].includes(e.key))
                                e.preventDefault();
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="border rounded px-3 py-2 w-full appearance-none"
                    />
                    {errMonto && <p className="text-red-600 text-xs">{errMonto}</p>}
                </div>

                {/* OBSERVACIONES */}
                <div className="space-y-1">
                    <label className="text-sm font-medium">Observaciones</label>
                    <textarea
                        className="border rounded px-3 py-2 w-full"
                        value={form.observaciones ?? ""}
                        onChange={(e) => setForm((s) => ({ ...s, observaciones: e.target.value }))}
                        rows={3}
                    />
                </div>

                {/* Error general */}
                {errGeneral && <div className="text-red-600 text-sm">{errGeneral}</div>}

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" className="px-3 py-2 border rounded" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button
                        className="px-3 py-2 border rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={!isValid}
                    >
                        {loading ? "Guardando..." : "Crear"}
                    </button>
                </div>
            </form>

            {/* === LISTA DE CLIENTES (Forma 2) === */}
            {pickerOpen && (
                <ClientePickerDialog
                    onClose={() => setPickerOpen(false)}
                    onPick={(c) => {
                        seleccionarCliente(c);
                        setPickerOpen(false);
                    }}
                />
            )}
        </div>
    );
}
