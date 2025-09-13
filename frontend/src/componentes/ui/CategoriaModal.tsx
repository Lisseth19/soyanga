import { useEffect, useState } from "react";
import type { CategoriaCrearDTO, OpcionIdNombre } from "@/types/categoria";
import { categoriaService } from "@/servicios/categoria";

type Props = {
  open: boolean;
  title?: string;
  initial?: CategoriaCrearDTO;
  excludeIdAsParent?: number | null;
  onClose: () => void;
  onSubmit: (payload: CategoriaCrearDTO) => Promise<void> | void;
};

export default function CategoriaModal({
  open,
  title = "Nueva categoría",
  initial,
  excludeIdAsParent,
  onClose,
  onSubmit,
}: Props) {
  const [nombreCategoria, setNombre] = useState(initial?.nombreCategoria ?? "");
  const [descripcion, setDescripcion] = useState<string>(initial?.descripcion ?? "");
  const [idCategoriaPadre, setPadre] = useState<number | "">(initial?.idCategoriaPadre ?? "");
  const [opciones, setOpciones] = useState<OpcionIdNombre[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(initial?.nombreCategoria ?? "");
    setDescripcion(initial?.descripcion ?? "");
    setPadre(initial?.idCategoriaPadre ?? "");

    (async () => {
      const opts = await categoriaService.options();
      setOpciones(
        excludeIdAsParent
          ? opts.filter((o: OpcionIdNombre) => o.id !== excludeIdAsParent)
          : opts
      );
    })();
  }, [open, initial, excludeIdAsParent]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CategoriaCrearDTO = {
        nombreCategoria: nombreCategoria.trim(),
        descripcion: (descripcion?.trim() || "") || null,
        idCategoriaPadre: idCategoriaPadre === "" ? null : Number(idCategoriaPadre),
      };
      await onSubmit(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form onSubmit={submit} className="bg-white rounded-xl p-4 w-[520px] shadow">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>

        <label className="block mb-2">
          <span className="block text-sm text-gray-600">Nombre *</span>
          <input
            className="border rounded px-3 py-2 w-full"
            value={nombreCategoria}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={120}
          />
        </label>

        <label className="block mb-2">
          <span className="block text-sm text-gray-600">Descripción</span>
          <textarea
            className="border rounded px-3 py-2 w-full"
            value={descripcion ?? ""}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </label>

        <label className="block mb-4">
          <span className="block text-sm text-gray-600">Categoría padre</span>
          <select
            className="border rounded px-3 py-2 w-full"
            value={idCategoriaPadre}
            onChange={(e) => setPadre(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">(sin padre)</option>
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className="px-3 py-2" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
