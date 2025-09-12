import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SucursalForm from "./SucursalForm";
import { sucursalService } from "@/servicios/sucursal";
import type { Sucursal } from "@/types/sucursal";

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
