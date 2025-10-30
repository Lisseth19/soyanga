// src/paginas/impuestos/ImpuestoCrearForm.tsx
import { useEffect, useRef, useState } from "react";
import { impuestosService } from "@/servicios/impuestos";
import type { Impuesto, ImpuestoCrearDTO } from "@/types/impuestos";

type Props = {
    onCancel?: () => void;
    onCreated?: () => void;
    onUpdated?: () => void;
    impuesto?: Impuesto | null;   // si viene, es edición
};

export default function ImpuestoCrearForm({ onCancel, onCreated, onUpdated, impuesto }: Props) {
    const modo = impuesto ? "editar" : "crear";

    const [nombre, setNombre] = useState(impuesto?.nombreImpuesto ?? "");
    const [porcentaje, setPorcentaje] = useState<string>(
        impuesto ? String(impuesto.porcentaje) : ""
    );
    const [activo, setActivo] = useState(impuesto?.estadoActivo ?? true);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const panelRef = useRef<HTMLDivElement | null>(null);

    // cerrar al click afuera o ESC
    useEffect(() => {
        function handleDown(ev: MouseEvent | PointerEvent) {
            const el = panelRef.current;
            if (!el) return;
            if (!el.contains(ev.target as Node)) onCancel?.();
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

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (!nombre.trim()) return setErr("El nombre es obligatorio.");
        const pctNum = porcentaje === "" ? NaN : Number(porcentaje);
        if (!Number.isFinite(pctNum) || pctNum < 0)
            return setErr("El porcentaje debe ser un número mayor o igual a 0.");

        try {
            setLoading(true);
            const dto: ImpuestoCrearDTO = {
                nombreImpuesto: nombre.trim(),
                porcentaje: pctNum,
                estadoActivo: activo,
            };

            if (modo === "crear") {
                await impuestosService.crear(dto);
                onCreated?.();
            } else if (impuesto) {
                await impuestosService.editar(impuesto.idImpuesto, dto);
                onUpdated?.();
            }
        } catch (e: any) {
            setErr(e?.message ?? "No se pudo guardar el impuesto");
        } finally {
            setLoading(false);
        }
    }

    const isValid =
        !!nombre.trim() && porcentaje !== "" && Number(porcentaje) >= 0 && !loading;

    return (
        <div ref={panelRef} className="bg-white rounded-xl shadow-xl p-4 w-full max-w-lg">
            <form onSubmit={submit} className="space-y-4">
                <h3 className="text-lg font-semibold">
                    {modo === "crear" ? "Nuevo impuesto" : "Editar impuesto"}
                </h3>

                <div className="space-y-1">
                    <label className="text-sm font-medium">Nombre</label>
                    <input
                        className="border rounded px-3 py-2 w-full"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium">Porcentaje (%)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.0001"
                        className="border rounded px-3 py-2 w-full"
                        value={porcentaje}
                        onChange={(e) => setPorcentaje(e.target.value)}
                    />
                </div>

                <label className="inline-flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                    />
                    <span>Activo</span>
                </label>

                {err && <div className="text-red-600 text-sm">{err}</div>}

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" className="px-3 py-2 border rounded" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button
                        className="px-3 py-2 border rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={!isValid}
                    >
                        {loading
                            ? "Guardando..."
                            : modo === "crear"
                                ? "Crear"
                                : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </div>
    );
}
