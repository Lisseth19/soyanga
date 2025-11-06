import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sprout, NotebookPen, ShieldCheck, Tag, Boxes } from "lucide-react";
import { crearProducto, actualizarProducto } from "@/servicios/producto";
import { opcionesCategoria } from "@/servicios/categoria";
import { presentacionService } from "@/servicios/presentacion";
import type { ProductoDTO, ProductoCrearDTO, ProductoActualizarDTO } from "@/types/producto";
import { ApiError } from "@/servicios/httpClient";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  producto?: ProductoDTO;               // requerido en "edit"
  onClose: () => void;
  onSaved: (p: ProductoDTO) => void;    // se dispara con el DTO devuelto
};

type FormState = {
  nombreProducto: string;
  descripcion: string;
  idCategoria: number | "";
  principioActivo: string;
  registroSanitario: string;
  estadoActivo: boolean;
};

const DESC_MAX = 1000; // 👈 nuevo tope

/* ===== Bloqueo del scroll del <body> mientras el modal está abierto (inline, sin archivos extra) ===== */
function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevOverflow = body.style.overflow;
    const prevPadRight = body.style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadRight;
    };
  }, [enabled]);
}

export default function ProductoModal({ open, mode, producto, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";

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
  const [presCount, setPresCount] = useState<number | null>(null);

  const nombreRef = useRef<HTMLInputElement | null>(null);

  // 🔒 bloquea el scroll del fondo
  useBodyScrollLock(open);

  // Cargar categorías al abrir
  useEffect(() => {
    if (!open) return;
    opcionesCategoria().then(setCategorias).catch(() => setCategorias([]));
  }, [open]);

  // Prefill + carga de presentaciones en edición
  useEffect(() => {
    if (!open) return;

    if (isEdit && producto) {
      setForm({
        nombreProducto: producto.nombreProducto ?? "",
        descripcion: producto.descripcion ?? "",
        idCategoria: (producto.idCategoria as number) ?? "",
        principioActivo: producto.principioActivo ?? "",
        registroSanitario: producto.registroSanitario ?? "",
        estadoActivo: !!producto.estadoActivo,
      });

      setPresCount(null);
      presentacionService
          .list({ idProducto: producto.idProducto, page: 0, size: 1 })
          .then((r) => setPresCount(r?.totalElements ?? 0))
          .catch(() => setPresCount(0));
    } else {
      setForm({
        nombreProducto: "",
        descripcion: "",
        idCategoria: "",
        principioActivo: "",
        registroSanitario: "",
        estadoActivo: true,
      });
      setPresCount(null);
    }

    setErrorMsg(null);
    setTimeout(() => nombreRef.current?.focus(), 50);
  }, [open, isEdit, producto]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  // Validación
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombreProducto.trim()) e.nombreProducto = "El nombre es obligatorio.";
    if (form.idCategoria === "" || form.idCategoria == null) e.idCategoria = "Selecciona una categoría.";
    return e;
  }, [form.nombreProducto, form.idCategoria]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // Helpers
  const handleChange =
      (field: keyof FormState) =>
          (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const value =
                e.currentTarget.type === "checkbox"
                    ? (e.currentTarget as HTMLInputElement).checked
                    : e.currentTarget.value;
            setForm((f) => ({
              ...f,
              [field]: field === "idCategoria" ? (value === "" ? "" : Number(value)) : (value as any),
            }));
          };

  // Guardar
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setErrorMsg("Revisa los campos marcados.");
      if (errors.nombreProducto) nombreRef.current?.focus();
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      if (isEdit && producto) {
        const dto: ProductoActualizarDTO = {
          nombreProducto: form.nombreProducto.trim(),
          descripcion: form.descripcion.trim() || null,
          idCategoria: form.idCategoria as number,
          principioActivo: form.principioActivo.trim() || null,
          registroSanitario: form.registroSanitario.trim() || null,
          estadoActivo: form.estadoActivo,
        };
        const out = await actualizarProducto(producto.idProducto, dto);
        onSaved(out);
      } else {
        const dto: ProductoCrearDTO = {
          nombreProducto: form.nombreProducto.trim(),
          descripcion: form.descripcion.trim() || undefined,
          idCategoria: form.idCategoria as number,
          principioActivo: form.principioActivo.trim() || undefined,
          registroSanitario: form.registroSanitario.trim() || undefined,
        };
        const out = await crearProducto(dto);
        onSaved(out);
      }
      onClose();
    } catch (e: any) {
      if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
        window.dispatchEvent(
            new CustomEvent("auth:forbidden", {
              detail: {
                source: "ProductoModal",
                message: isEdit
                    ? "No tienes permiso para actualizar productos."
                    : "No tienes permiso para crear productos.",
              },
            })
        );
        onClose();
        return;
      }
      let msg = e?.message ?? "No se pudo guardar el producto.";
      if (e instanceof ApiError) {
        if (typeof e.details === "string" && e.details.trim()) msg = e.details;
      }
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  /* ===== Estilos compactos: tarjetas y campos reducidos (para evitar scroll del modal) ===== */
  const label = "text-[12px] font-medium text-neutral-700";
  const help = "text-[11px] text-neutral-500";
  const input =
      "w-full px-2.5 py-1.5 rounded-md border border-neutral-300 placeholder-neutral-400 text-[13px] " +
      "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
  const invalid = "border-rose-300 focus:ring-rose-500 focus:border-rose-500";
  const sectionCard =
      "bg-white rounded-lg border border-neutral-200 shadow-sm p-2.5 space-y-2.5";
  const badge =
      "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-[1px] text-[11px] font-medium";

  return (
      <div className="fixed inset-0 z-[70]">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/35" onClick={() => !saving && onClose()} />
        {/* Wrapper centrado */}
        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
          {/* Contenedor: sin scroll general. El área de descripción gestiona su propio scroll. */}
          <div
              className="
            w-full max-w-3xl
            bg-neutral-50 rounded-2xl shadow-2xl border border-neutral-200
            h-[90dvh] sm:h-[80dvh]
            flex flex-col overflow-hidden
          "
          >
            {/* Header (compacto) */}
            <div className="px-4 py-2.5 bg-white border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-neutral-800 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                  <Sprout size={14} />
                </span>
                  {isEdit ? "Editar producto" : "Nuevo producto"}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Ficha de producto <span className={badge}>Agroimportadora</span>
                </p>
              </div>
              <button
                  className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500"
                  onClick={onClose}
                  aria-label="Cerrar"
                  title="Cerrar"
                  disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM: body sin scroll, con layout flexible */}
            <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col gap-2.5 p-3 sm:p-4">
                {errorMsg && (
                    <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                      {errorMsg}
                    </div>
                )}

                {/* Fila superior: Identificación + Regulatorio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Identificación */}
                  <div className={sectionCard}>
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-emerald-600" />
                      <span className="text-[13px] font-semibold text-neutral-800">Identificación</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className={label}>
                        Nombre <span className="text-rose-600">*</span>
                      </label>
                      <input
                          ref={nombreRef}
                          className={`${input} ${errors.nombreProducto ? invalid : ""}`}
                          placeholder="Ej. Glifosato 480 SL"
                          value={form.nombreProducto}
                          onChange={handleChange("nombreProducto")}
                      />
                      {errors.nombreProducto && <p className={help}>{errors.nombreProducto}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className={label}>
                        Categoría <span className="text-rose-600">*</span>
                      </label>
                      <select
                          className={`${input} ${errors.idCategoria ? invalid : ""}`}
                          value={form.idCategoria === "" ? "" : String(form.idCategoria)}
                          onChange={handleChange("idCategoria")}
                      >
                        <option value="">Selecciona…</option>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                        ))}
                      </select>
                      {errors.idCategoria && <p className={help}>{errors.idCategoria}</p>}
                    </div>

                    <label className="inline-flex items-center gap-2 text-[12px] text-neutral-700">
                      <input
                          type="checkbox"
                          checked={form.estadoActivo}
                          onChange={handleChange("estadoActivo")}
                      />
                      Activo
                    </label>

                    {isEdit && (
                        <div className="pt-0.5">
                          <div className="inline-flex items-center gap-2">
                        <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Boxes size={12} />
                        </span>
                            <span className="text-[12px] text-neutral-700">
                          Presentaciones: <span className={badge}>{presCount == null ? "…" : presCount}</span>
                        </span>
                          </div>
                        </div>
                    )}
                  </div>

                  {/* Regulatorio */}
                  <div className={sectionCard}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span className="text-[13px] font-semibold text-neutral-800">Regulatorio</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className={label}>Principio activo</label>
                      <input
                          className={input}
                          placeholder="Ej. Glifosato"
                          value={form.principioActivo}
                          onChange={handleChange("principioActivo")}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={label}>Registro sanitario</label>
                      <input
                          className={input}
                          placeholder="Ej. SENASAG R.S. 1234/2025"
                          value={form.registroSanitario}
                          onChange={handleChange("registroSanitario")}
                      />
                    </div>
                  </div>
                </div>

                {/* Descripción: ocupa el espacio restante y SOLO ella scrollea si es necesario */}
                <div className={`${sectionCard} flex-1 min-h-0 flex flex-col`}>
                  <div className="flex items-center gap-2">
                    <NotebookPen size={14} className="text-emerald-600" />
                    <span className="text-[13px] font-semibold text-neutral-800">Descripción</span>
                  </div>

                  {/* El wrapper de la textarea crece y permite scroll interno */}
                  <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                  <textarea
                      className={`${input} flex-1 min-h-0 resize-none overflow-auto`}
                      placeholder="Notas internas, cultivos objetivo, modo de acción, recomendaciones…"
                      maxLength={DESC_MAX}
                      value={form.descripcion}
                      onChange={handleChange("descripcion")}
                  />
                    <div className="text-[10px] text-neutral-500 text-right">
                      {form.descripcion.length}/{DESC_MAX}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer (compacto) */}
              <div className="px-3 sm:px-4 py-2.5 bg-white border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                    type="button"
                    className="px-3 h-9 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700"
                    onClick={onClose}
                    disabled={saving}
                >
                  Cancelar
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit || saving}
                    className="px-4 h-9 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
                >
                  {saving ? (isEdit ? "Guardando…" : "Creando…") : isEdit ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
}
