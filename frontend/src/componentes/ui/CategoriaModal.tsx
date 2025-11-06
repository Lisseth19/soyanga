import { useEffect, useMemo, useRef, useState } from "react";
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
  const nombreRef = useRef<HTMLInputElement | null>(null);

  // Límites
  const NOMBRE_MAX = 120;
  const DESC_MAX = 500;

  // Validación simple
  const nombreError = useMemo(() => {
    const v = (nombreCategoria ?? "").trim();
    if (!v) return "El nombre es obligatorio.";
    if (v.length > NOMBRE_MAX) return `Máximo ${NOMBRE_MAX} caracteres.`;
    return null;
  }, [nombreCategoria]);

  const descError = useMemo(() => {
    const v = descripcion ?? "";
    if (v.length > DESC_MAX) return `Máximo ${DESC_MAX} caracteres.`;
    return null;
  }, [descripcion]);

  const puedeGuardar = useMemo(() => !saving && !nombreError && !descError, [saving, nombreError, descError]);

  // Reset y carga de opciones al abrir
  useEffect(() => {
    if (!open) return;
    setNombre(initial?.nombreCategoria ?? "");
    setDescripcion(initial?.descripcion ?? "");
    setPadre(initial?.idCategoriaPadre ?? "");
    // enfoque al abrir
    setTimeout(() => nombreRef.current?.focus(), 0);

    (async () => {
      const opts = await categoriaService.options();
      setOpciones(
          excludeIdAsParent ? opts.filter((o) => o.id !== excludeIdAsParent) : opts
      );
    })();
  }, [open, initial, excludeIdAsParent]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeGuardar) return;

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
        <form
            onSubmit={submit}
            className="bg-white rounded-xl p-5 w-[92vw] max-w-[560px] shadow-xl border border-neutral-200"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
                type="button"
                className="text-neutral-500 hover:text-neutral-700"
                onClick={onClose}
                aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Nombre */}
          <label className="block mb-3">
          <span className="block text-sm text-gray-700">
            Nombre <span className="text-rose-600">*</span>
          </span>
            <input
                ref={nombreRef}
                className={`border rounded-lg px-3 py-2 w-full outline-none focus:ring-2 ${
                    nombreError ? "border-rose-300 focus:ring-rose-400" : "focus:ring-emerald-500"
                }`}
                value={nombreCategoria}
                onChange={(e) => setNombre(e.target.value)}
                required
                maxLength={NOMBRE_MAX}
                placeholder="Ej. Herbicidas, Insecticidas, Fertilizantes foliares…"
            />
            <div className="flex items-center justify-between mt-1">
              <small className="text-neutral-500">Usa un nombre claro y corto.</small>
              <small className="text-neutral-400">{nombreCategoria.length}/{NOMBRE_MAX}</small>
            </div>
            {nombreError && (
                <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                  {nombreError}
                </div>
            )}
          </label>

          {/* Descripción */}
          <label className="block mb-3">
            <span className="block text-sm text-gray-700">Descripción</span>
            <textarea
                className={`border rounded-lg px-3 py-2 w-full outline-none focus:ring-2 min-h-[88px] resize-y ${
                    descError ? "border-rose-300 focus:ring-rose-400" : "focus:ring-emerald-500"
                }`}
                value={descripcion ?? ""}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                maxLength={DESC_MAX}
                placeholder="Ej. Productos para control de malezas de hoja ancha en cultivos de soya, maíz o trigo…"
            />
            <div className="flex items-center justify-between mt-1">
              <small className="text-neutral-500">Opcional, pero útil para el equipo.</small>
              <small className="text-neutral-400">{(descripcion?.length ?? 0)}/{DESC_MAX}</small>
            </div>
            {descError && (
                <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                  {descError}
                </div>
            )}
          </label>

          {/* Categoría padre */}
          <label className="block mb-5">
            <span className="block text-sm text-gray-700">Categoría padre</span>
            <select
                className="border rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-emerald-500"
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
            <small className="text-neutral-500">
              Si eliges un padre, esta será una subcategoría (p. ej., “Herbicidas sistémicos” dentro de “Herbicidas”).
            </small>
          </label>

          <div className="flex justify-end gap-2">
            <button
                type="button"
                className="px-4 py-2 rounded-lg border hover:bg-neutral-50 disabled:opacity-50"
                onClick={onClose}
                disabled={saving}
            >
              Cancelar
            </button>
            <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                disabled={!puedeGuardar}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
  );
}
