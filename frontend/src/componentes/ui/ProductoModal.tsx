import { useEffect, useMemo, useState } from "react";
import { crearProducto, actualizarProducto, desactivarProducto } from "@/servicios/producto";
import type { ProductoDTO } from "@/types/producto";
import { opcionesCategoria } from "@/servicios/categoria";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  producto?: ProductoDTO;               // requerido en modo "edit"
  onClose: () => void;
  onSaved: (p: ProductoDTO) => void;    // se dispara al crear/editar OK
};

type FormState = {
  nombreProducto: string;
  descripcion: string;
  idCategoria: number | "";
  principioActivo: string;
  registroSanitario: string;
  estadoActivo: boolean;
};

export default function ProductoModal({ open, mode, producto, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    nombreProducto: "",
    descripcion: "",
    idCategoria: "",
    principioActivo: "",
    registroSanitario: "",
    estadoActivo: true,
  });
  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    opcionesCategoria()
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && producto) {
      setForm({
        nombreProducto: producto.nombreProducto ?? "",
        descripcion: producto.descripcion ?? "",
        idCategoria: producto.idCategoria ?? "",
        principioActivo: producto.principioActivo ?? "",
        registroSanitario: producto.registroSanitario ?? "",
        estadoActivo: !!producto.estadoActivo,
      });
    } else if (!isEdit) {
      setForm({
        nombreProducto: "",
        descripcion: "",
        idCategoria: "",
        principioActivo: "",
        registroSanitario: "",
        estadoActivo: true,
      });
    }
    setErrorMsg(null);
  }, [open, isEdit, producto]);

  const canSubmit = useMemo(() => {
    return !!form.nombreProducto.trim() && typeof form.idCategoria === "number";
  }, [form]);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        e.currentTarget.type === "checkbox"
          ? (e.currentTarget as HTMLInputElement).checked
          : e.currentTarget.value;

      setForm((f) => ({
        ...f,
        [field]:
          field === "idCategoria"
            ? (value === "" ? "" : Number(value))
            : (value as any),
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      if (isEdit && producto) {
        const out = await actualizarProducto(producto.idProducto, {
          nombreProducto: form.nombreProducto.trim(),
          descripcion: form.descripcion.trim() || null,
          idCategoria: form.idCategoria as number,
          principioActivo: form.principioActivo.trim() || null,
          registroSanitario: form.registroSanitario.trim() || null,
          estadoActivo: form.estadoActivo,
        });
        onSaved(out);
      } else {
        const out = await crearProducto({
          nombreProducto: form.nombreProducto.trim(),
          descripcion: form.descripcion.trim() || null,
          idCategoria: form.idCategoria as number,
          principioActivo: form.principioActivo.trim() || null,
          registroSanitario: form.registroSanitario.trim() || null,
          estadoActivo: form.estadoActivo,
        });
        onSaved(out);
      }
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!producto) return;
    if (!confirm("¿Desactivar este producto?")) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await desactivarProducto(producto.idProducto);
      // devolvemos el mismo producto con estadoActivo=false para refrescar rápido si lo necesitas
      onSaved({ ...producto, estadoActivo: false });
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || "No se pudo desactivar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} />
      {/* Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button className="px-2 py-1 text-gray-500 hover:text-black" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Nombre *</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.nombreProducto}
                onChange={handleChange("nombreProducto")}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Categoría *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.idCategoria === "" ? "" : String(form.idCategoria)}
                onChange={handleChange("idCategoria")}
                required
              >
                <option value="">Seleccione…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Principio activo</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.principioActivo}
                onChange={handleChange("principioActivo")}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Registro sanitario</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.registroSanitario}
                onChange={handleChange("registroSanitario")}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Descripción</label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[90px]"
                value={form.descripcion}
                onChange={handleChange("descripcion")}
              />
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.estadoActivo}
                  onChange={handleChange("estadoActivo")}
                />
                Activo
              </label>
            </div>
          </div>

          {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-2 border rounded text-red-600 border-red-300 hover:bg-red-50"
                title="Desactiva (no borra físicamente)"
              >
                Desactivar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
