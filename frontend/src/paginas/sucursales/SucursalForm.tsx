import { useState } from "react";
import type { SucursalCreate, Sucursal } from "@/types/sucursal";

type Props =
  | { mode: "create"; initial?: Partial<SucursalCreate>; onSubmit: (p: SucursalCreate) => Promise<void> }
  | { mode: "edit";   initial: Sucursal;                  onSubmit: (p: Sucursal) => Promise<void> };

export default function SucursalForm(props: Props) {
  const isCreate = props.mode === "create";
  const init = isCreate
    ? {
        nombreSucursal: "",
        direccion: "",
        ciudad: "",
        estadoActivo: true,
        ...(props.initial || {}),
      }
    : props.initial;

  const [form, setForm] = useState<any>(init);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nombreSucursal?.trim()) e.nombreSucursal = "Requerido";
    if (!form.direccion?.trim()) e.direccion = "Requerido";
    if (!form.ciudad?.trim()) e.ciudad = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitErr(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await props.onSubmit(form);
    } catch (err: any) {
      setSubmitErr(err?.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm text-gray-600">Nombre de la sucursal</label>
        <input
          className="mt-1 w-full border rounded-lg px-3 py-2"
          value={form.nombreSucursal}
          onChange={(e) => setForm({ ...form, nombreSucursal: e.target.value })}
          placeholder="Central, Norte, etc."
        />
        {errors.nombreSucursal && <p className="text-red-600 text-sm">{errors.nombreSucursal}</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-600">Dirección</label>
        <input
          className="mt-1 w-full border rounded-lg px-3 py-2"
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          placeholder="Av. Siempre Viva 123"
        />
        {errors.direccion && <p className="text-red-600 text-sm">{errors.direccion}</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-600">Ciudad</label>
        <input
          className="mt-1 w-full border rounded-lg px-3 py-2"
          value={form.ciudad}
          onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
          placeholder="Cochabamba"
        />
        {errors.ciudad && <p className="text-red-600 text-sm">{errors.ciudad}</p>}
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!form.estadoActivo}
          onChange={(e) => setForm({ ...form, estadoActivo: e.target.checked })}
        />
        <span>Activo</span>
      </label>

      {submitErr && <div className="text-red-600 text-sm">{submitErr}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {submitting ? "Guardando..." : isCreate ? "Crear sucursal" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
