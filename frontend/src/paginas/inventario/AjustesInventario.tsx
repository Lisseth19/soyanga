import { useEffect, useMemo, useState } from "react";
import { almacenService } from "@/servicios/almacen";
import { lotesOptionsByAlmacen } from "@/servicios/inventario";
import type { AjusteCrearDTO, AjusteRespuestaDTO } from "@/types/ajustes";
import { ajusteService } from "@/servicios/ajustes";


// Util: UUID seguro en navegador
function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AjustesInventarioPage() {
  const [tipo, setTipo] = useState<"salida" | "ingreso">("salida");

  // form state
  const [idAlmacen, setIdAlmacen] = useState<number | "">("");
  const [idLote, setIdLote] = useState<number | "">("");
  const [cantidad, setCantidad] = useState<string>("");
  const [motivoCodigo, setMotivoCodigo] = useState<string>("ROTURA");
  const [observacion, setObservacion] = useState<string>("");

  // data
  const [almacenes, setAlmacenes] = useState<Array<{ id: number; nombre: string }>>([]);
  const [lotes, setLotes] = useState<Array<{ id: number; nombre: string; stock?: number }>>([]);

  // ux
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [resp, setResp] = useState<AjusteRespuestaDTO | null>(null);

  // cargar combos
  useEffect(() => {
    (async () => {
      try {
        const opts = await almacenService.options({ incluirInactivos: false });
        setAlmacenes(opts);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los almacenes");
      }
    })();
  }, []);

  // lotes dependientes de almacén
  useEffect(() => {
    (async () => {
      setIdLote("");
      if (!idAlmacen || typeof idAlmacen !== "number") {
        setLotes([]);
        return;
      }
      try {
        const opts = await lotesOptionsByAlmacen(idAlmacen);
        setLotes(opts);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los lotes del almacén seleccionado");
      }
    })();
  }, [idAlmacen]);

  // motivos por tipo
  const motivos = useMemo(() => {
    return tipo === "salida"
      ? [
          { code: "ROTURA", label: "Rotura / Daño" },
          { code: "MERMA", label: "Merma" },
          { code: "AJUSTE_NEGATIVO", label: "Ajuste negativo" },
        ]
      : [
          { code: "AJUSTE_POSITIVO", label: "Ajuste positivo" },
          { code: "DEVOLUCION", label: "Devolución" },
        ];
  }, [tipo]);

  useEffect(() => {
    // preselección del motivo acorde al tab
    setMotivoCodigo(motivos[0]?.code ?? "");
  }, [motivos]);

  const loteSeleccionado = useMemo(() => {
    if (!idLote || typeof idLote !== "number") return undefined;
    return lotes.find((l) => l.id === idLote);
  }, [idLote, lotes]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setResp(null);

    // validaciones front
    if (!idAlmacen || !idLote) {
      setError("Selecciona un almacén y un lote");
      return;
    }
    const cant = Number(cantidad);
    if (!cant || cant <= 0) {
      setError("La cantidad debe ser mayor que cero");
      return;
    }
    if (tipo === "salida" && loteSeleccionado?.stock != null && cant > (loteSeleccionado?.stock ?? 0)) {
      setError("La cantidad supera el stock disponible del lote");
      return;
    }

    const dto: AjusteCrearDTO = {
      idAlmacen: idAlmacen as number,
      idLote: idLote as number,
      cantidad: cant,
      motivoCodigo,
      observaciones: observacion || undefined,
      requestId: uuid(),
    };

    try {
      setLoading(true);
      const r = tipo === "salida" ? await ajusteService.salida(dto) : await ajusteService.ingreso(dto);
      setResp(r);
      setOkMsg("Ajuste aplicado correctamente");
      // limpiar cantidad para forzar siguiente input
      setCantidad("");
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Error procesando el ajuste";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Ajustes de Inventario</h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTipo("salida")}
          className={
            "px-4 py-2 rounded-2xl shadow " + (tipo === "salida" ? "bg-gray-900 text-white" : "bg-gray-100")
          }
        >
          Salida
        </button>
        <button
          onClick={() => setTipo("ingreso")}
          className={
            "px-4 py-2 rounded-2xl shadow " + (tipo === "ingreso" ? "bg-gray-900 text-white" : "bg-gray-100")
          }
        >
          Ingreso
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={onSubmit} className="grid gap-4 bg-white rounded-2xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Almacén</label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={idAlmacen}
              onChange={(e) => setIdAlmacen(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">— Selecciona —</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Lote</label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={idLote}
              onChange={(e) => setIdLote(e.target.value ? Number(e.target.value) : "")}
              disabled={!idAlmacen}
              required
            >
              <option value="">— Selecciona —</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}{l.stock != null ? ` — Stock: ${l.stock}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Cantidad</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              className="w-full border rounded-xl px-3 py-2"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0.000"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Motivo</label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={motivoCodigo}
              onChange={(e) => setMotivoCodigo(e.target.value)}
              required
            >
              {motivos.map((m) => (
                <option key={m.code} value={m.code}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Observación</label>
          <textarea
            className="w-full border rounded-xl px-3 py-2"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Escribe un detalle opcional"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {loading ? "Procesando..." : (tipo === "salida" ? "Aplicar salida" : "Aplicar ingreso")}
          </button>
          {loteSeleccionado?.stock != null && (
            <span className="text-sm text-gray-500">
              Stock actual del lote: <strong>{loteSeleccionado.stock}</strong>
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {okMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{okMsg}</div>
        )}
      </form>

      {/* Resumen del último ajuste */}
      {resp && (
        <div className="mt-4 bg-white rounded-2xl shadow p-4">
          <h2 className="font-medium mb-2">Último ajuste</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Tipo:</span> {resp.tipo}</div>
            <div><span className="text-gray-500">Movimiento #:</span> {resp.idMovimiento ?? "—"}</div>
            <div><span className="text-gray-500">Almacén:</span> {resp.idAlmacen}</div>
            <div><span className="text-gray-500">Lote:</span> {resp.idLote}</div>
            <div><span className="text-gray-500">Cant. ajustada:</span> {resp.cantidadAjustada}</div>
            {resp.cantidadAnterior != null && (
              <div><span className="text-gray-500">Antes:</span> {String(resp.cantidadAnterior)}</div>
            )}
            {resp.cantidadNueva != null && (
              <div><span className="text-gray-500">Después:</span> {String(resp.cantidadNueva)}</div>
            )}
            <div><span className="text-gray-500">Fecha:</span> {new Date(resp.fechaMovimiento).toLocaleString()}</div>
            {resp.observaciones && (
              <div className="md:col-span-2"><span className="text-gray-500">Obs.:</span> {resp.observaciones}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
