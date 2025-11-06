import { useMemo, useState } from "react";
import type { SucursalCreate, Sucursal } from "@/types/sucursal";
import { Check, Eraser, X } from "lucide-react";

type CreateProps = {
    mode: "create";
    initial?: Partial<SucursalCreate>;
    onSubmit: (p: SucursalCreate) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean; // opcional: deshabilitar por permisos u otro estado
};

type EditProps = {
    mode: "edit";
    initial: Sucursal;
    onSubmit: (p: Sucursal) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean; // opcional
};

type Props = CreateProps | EditProps;

type FormState = {
    nombreSucursal: string;
    direccion: string;
    ciudad: string;
    estadoActivo: boolean;
};

export default function SucursalForm(props: Props) {
    const isCreate = props.mode === "create";

    const initialState: FormState = useMemo(() => {
        if (isCreate) {
            const base: FormState = {
                nombreSucursal: "",
                direccion: "",
                ciudad: "",
                estadoActivo: true,
            };
            const init = (props.initial ?? {}) as Partial<SucursalCreate>;
            return {
                nombreSucursal: init.nombreSucursal ?? base.nombreSucursal,
                direccion: init.direccion ?? base.direccion,
                ciudad: init.ciudad ?? base.ciudad,
                estadoActivo: init.estadoActivo ?? base.estadoActivo,
            };
        } else {
            const init = props.initial as Sucursal;
            return {
                nombreSucursal: init.nombreSucursal,
                direccion: init.direccion ?? "",
                ciudad: init.ciudad ?? "",
                estadoActivo: !!init.estadoActivo,
            };
        }
    }, [isCreate, props.initial]);

    const [form, setForm] = useState<FormState>(initialState);
    const [errors, setErrors] = useState<Record<keyof FormState, string>>({} as any);
    const [submitting, setSubmitting] = useState(false);
    const [submitErr, setSubmitErr] = useState<string | null>(null);

    const isDisabled = !!props.disabled || submitting;

    function validate() {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.nombreSucursal?.trim()) e.nombreSucursal = "Requerido";
        if (!form.direccion?.trim()) e.direccion = "Requerido";
        if (!form.ciudad?.trim()) e.ciudad = "Requerido";
        setErrors(e as Record<keyof FormState, string>);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(ev: React.FormEvent) {
        ev.preventDefault();
        setSubmitErr(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            if (isCreate) {
                const payload: SucursalCreate = {
                    nombreSucursal: form.nombreSucursal.trim(),
                    direccion: form.direccion.trim(),
                    ciudad: form.ciudad.trim(),
                    estadoActivo: form.estadoActivo,
                };
                await props.onSubmit(payload);
            } else {
                const payload: Sucursal = {
                    // En edit mando el objeto completo; si prefieres parcial usa SucursalUpdate
                    idSucursal: (props as EditProps).initial.idSucursal,
                    nombreSucursal: form.nombreSucursal.trim(),
                    direccion: form.direccion.trim(),
                    ciudad: form.ciudad.trim(),
                    estadoActivo: form.estadoActivo,
                };
                await props.onSubmit(payload);
            }
        } catch (err: any) {
            setSubmitErr(err?.message || "Error al guardar");
        } finally {
            setSubmitting(false);
        }
    }

    function handleReset() {
        setForm(initialState);
        setErrors({} as any);
        setSubmitErr(null);
    }

    const inputBase =
        "w-full rounded-lg px-3 py-2 bg-white/90 placeholder-neutral-400 border focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";
    const inputErr = "border-rose-300";
    const inputOk = "border-neutral-300";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {/* Nombre */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nombre de la sucursal <span className="text-rose-600">*</span>
                </label>
                <input
                    className={[inputBase, errors.nombreSucursal ? inputErr : inputOk].join(" ")}
                    value={form.nombreSucursal}
                    onChange={(e) => setForm((f) => ({ ...f, nombreSucursal: e.target.value }))}
                    placeholder="Central, Norte, etc."
                    aria-invalid={!!errors.nombreSucursal}
                    disabled={isDisabled}
                    autoComplete="off"
                />
                {errors.nombreSucursal && <p className="text-rose-600 text-xs mt-1">{errors.nombreSucursal}</p>}
            </div>

            {/* Dirección */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Dirección <span className="text-rose-600">*</span>
                </label>
                <input
                    className={[inputBase, errors.direccion ? inputErr : inputOk].join(" ")}
                    value={form.direccion}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                    placeholder="Av. Siempre Viva 123"
                    aria-invalid={!!errors.direccion}
                    disabled={isDisabled}
                    autoComplete="off"
                />
                {errors.direccion && <p className="text-rose-600 text-xs mt-1">{errors.direccion}</p>}
            </div>

            {/* Ciudad */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Ciudad <span className="text-rose-600">*</span>
                </label>
                <input
                    className={[inputBase, errors.ciudad ? inputErr : inputOk].join(" ")}
                    value={form.ciudad}
                    onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                    placeholder="Cochabamba"
                    aria-invalid={!!errors.ciudad}
                    disabled={isDisabled}
                    autoComplete="off"
                />
                {errors.ciudad && <p className="text-rose-600 text-xs mt-1">{errors.ciudad}</p>}
            </div>

            {/* Activo */}
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-700">Estado</label>
                <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                    <input
                        type="checkbox"
                        className="accent-emerald-600"
                        checked={!!form.estadoActivo}
                        onChange={(e) => setForm((f) => ({ ...f, estadoActivo: e.target.checked }))}
                        disabled={isDisabled}
                    />
                    <span>{form.estadoActivo ? "Activo" : "Inactivo"}</span>
                </label>
            </div>

            {/* Error submit */}
            {submitErr && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                    {submitErr}
                </div>
            )}

            {/* Botones */}
            <div className="flex flex-wrap gap-2 pt-2">
                <button
                    type="submit"
                    disabled={isDisabled}
                    className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                    <Check size={16} />
                    {submitting ? "Guardando…" : isCreate ? "Crear sucursal" : "Guardar cambios"}
                </button>

                {props.onCancel && (
                    <button
                        type="button"
                        onClick={props.onCancel}
                        disabled={isDisabled}
                        className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-60"
                        title={isCreate ? "Cancelar" : "Cancelar edición"}
                    >
                        <X size={16} />
                        Cancelar
                    </button>
                )}

                {/* Limpiar solo en crear */}
                {isCreate && (
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isDisabled}
                        className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-60"
                        title="Limpiar formulario"
                    >
                        <Eraser size={16} />
                        Limpiar
                    </button>
                )}
            </div>
        </form>
    );
}
