import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SucursalForm from "./SucursalForm";
import { sucursalService } from "@/servicios/sucursal";
import type { Sucursal } from "@/types/sucursal";
import { ApiError } from "@/servicios/httpClient";

/* ====== PÁGINA ORIGINAL (se mantiene igual) ====== */
export default function EditarSucursal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Sucursal | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    sucursalService
        .get(Number(id))
        .then(setData)
        .catch((e: any) => setErr(e?.message || "Error cargando sucursal"))
        .finally(() => setLoading(false));
  }, [id]);

  async function onSubmit(payload: Sucursal) {
    await sucursalService.update(payload.idSucursal, payload);
    navigate("/sucursales?updated=1");
  }

  if (loading) return <div className="p-6">Cargando…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;
  if (!data) return null;

  return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Editar sucursal</h1>
        <SucursalForm mode="edit" initial={data} onSubmit={onSubmit} />
      </div>
  );
}

/* ====== VERSIÓN MODAL MEJORADA ======
   - Acepta `initial` para render inmediato.
   - Si también pasas `id`, hace fetch para refrescar (opcional).
*/
export function EditarSucursalModal({
                                      id,
                                      initial,
                                      onClose,
                                      afterSave,
                                    }: {
  id?: number;
  initial?: Sucursal;          // <- permite render inmediato
  onClose: () => void;
  afterSave?: () => void;
}) {
  const [data, setData] = useState<Sucursal | null>(initial ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial); // si hay initial, no esperamos

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!id) return;               // si no hay id, nos quedamos con initial
      try {
        setLoading(true);
        const s = await sucursalService.get(id);
        if (!cancel) setData(s);
      } catch (e: any) {
        if (!cancel) {
          if ((e instanceof ApiError && e.status === 403) || e?.status === 403) {
            // si usas globalDenied en tu app:
            window.dispatchEvent(new CustomEvent("auth:forbidden", { detail: { source: "EditarSucursalModal" } }));
            setErr("Acceso denegado.");
          } else {
            setErr(e?.message || "Error cargando sucursal");
          }
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    // si tenemos initial, igual podemos refrescar silenciosamente:
    if (id) load();
    return () => { cancel = true; };
  }, [id]);

  async function onSubmit(payload: Sucursal) {
    await sucursalService.update(payload.idSucursal, payload);
    afterSave?.();
  }

  if (loading && !data) return <div>Cargando…</div>;
  if (err) return <div className="text-red-600 text-sm">Error: {err}</div>;
  if (!data) return null;

  return (
      <div className="space-y-2">
        <SucursalForm mode="edit" initial={data} onSubmit={onSubmit} />
        <div className="pt-1">
          <button
              type="button"
              onClick={onClose}
              className="px-3 h-9 rounded-lg border border-neutral-300 hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </div>
      </div>
  );
}
