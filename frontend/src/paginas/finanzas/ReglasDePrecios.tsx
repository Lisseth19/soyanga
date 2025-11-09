import { useEffect, useMemo, useRef, useState } from "react";
import { preciosService } from "@/servicios/precios";
import { monedaService } from "@/servicios/moneda";
import AjusteManualModal from "@/componentes/precios/AjusteManualModal";
import type { Moneda } from "@/types/moneda";
import type { ConfigRedondeoDTO, ResumenRecalculo } from "@/types/precios";

type Impacto = ResumenRecalculo;

export default function ReglasDePrecios() {
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [idOrigen, setIdOrigen] = useState<number | null>(null);
  const [idDestino, setIdDestino] = useState<number | null>(null);

  const [tasa, setTasa] = useState<string>("");
  const [fecha, setFecha] = useState<string>("");

  const [cfg, setCfg] = useState<ConfigRedondeoDTO>({ modo: "ENTERO", multiplo: null, decimales: null });

  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [cargando, setCargando] = useState(false);

  const [modalManual, setModalManual] = useState<{ open: boolean; id: number | null; sku?: string }>({
    open: false,
    id: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const page = await monedaService.list({ activos: true, page: 0, size: 200 });
        const normalized = page.content.map((m) => ({ ...m, tasaCambioRespectoLocal: m.tasaCambioRespectoLocal ?? null }));
        setMonedas(normalized);

        const local = normalized.find((m) => m.esLocal) ?? normalized[0];
        const otra = normalized.find((m) => !m.esLocal) ?? normalized[1] ?? normalized[0];
        if (otra && local) {
          setIdOrigen(otra.idMoneda);
          setIdDestino(local.idMoneda);
        }
      } catch (e) {
        console.error("❌ No se pudo cargar monedas:", e);
      }

      preciosService.getRedondeo().then(setCfg).catch(() => {});
    })();
  }, []);

  useEffect(() => {
    if (idOrigen && idDestino) {
      preciosService
        .tcVigente(idOrigen, idDestino)
        .then((t) => {
          if (t?.tasaCambio != null) setTasa(String(t.tasaCambio));
        })
        .catch(() => {});
    }
  }, [idOrigen, idDestino]);

  const dtoRedondeo: ConfigRedondeoDTO = useMemo(() => {
    if (cfg.modo === "MULTIPLO") return { modo: "MULTIPLO", multiplo: cfg.multiplo ?? 0.5, decimales: null };
    if (cfg.modo === "DECIMALES") return { modo: "DECIMALES", decimales: cfg.decimales ?? 2, multiplo: null };
    if (cfg.modo === "NINGUNO") return { modo: "NINGUNO" };
    return { modo: "ENTERO" };
  }, [cfg]);

  // --- idempotencia TC desde UI ---
  const lastTcCreadoRef = useRef<string | null>(null);
  const sameDay = (a?: string, b?: string) => !!a && !!b && a.slice(0, 10) === b.slice(0, 10);

  const intentarCrearTC = async () => {
    if (!tasa || !fecha || !idOrigen || !idDestino) return;
    if (lastTcCreadoRef.current && sameDay(lastTcCreadoRef.current, fecha)) return;

    const vigente = await preciosService.tcVigente(idOrigen, idDestino, fecha);
    if (!sameDay(vigente?.fechaVigencia, fecha)) {
      try {
        await preciosService.crearTC({
          idMonedaOrigen: idOrigen,
          idMonedaDestino: idDestino,
          fechaVigencia: fecha,
          tasaCambio: Number(tasa),
        });
      } catch (e: any) {
        if (!/duplicate key|llave duplicada|23505|uq_tc_par_fecha/i.test(String(e?.message || ""))) {
          throw e;
        }
      }
    }
    lastTcCreadoRef.current = fecha;
  };

  const simular = async () => {
    if (!idOrigen || !idDestino) return alert("Selecciona origen y destino");
    setCargando(true);
    try {
      await intentarCrearTC();
      const r = await preciosService.recalcular(idOrigen, idDestino, true, "Simulación UI", fecha || undefined);
      setImpacto(r);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (!/duplicate key|llave duplicada|uq_tc_par_fecha/i.test(msg)) alert(msg || "Error al simular");
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async () => {
    if (!idOrigen || !idDestino) return alert("Selecciona origen y destino");
    setCargando(true);
    try {
      await intentarCrearTC();
      const r = await preciosService.recalcular(idOrigen, idDestino, false, "Re-cálculo por TC (UI)", fecha || undefined);
      setImpacto(r);
      alert("Re-cálculo aplicado correctamente");
    } catch (e: any) {
      alert(e?.message || "Error al aplicar");
    } finally {
      setCargando(false);
    }
  };

  const guardarRedondeo = async () => {
    try {
      const updated = await preciosService.updateRedondeo(dtoRedondeo, "admin-ui");
      setCfg(updated);
      alert("Parámetros de redondeo guardados");
    } catch (e: any) {
      alert(e.message || "No se pudo guardar el redondeo");
    }
  };

  const mOrigen = monedas.find((m) => m.idMoneda === idOrigen);
  const mDestino = monedas.find((m) => m.idMoneda === idDestino);

  return (
    <div className="p-6 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">Configuración de Reglas de Precios</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuración TC */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Configuración de la Tasa de Cambio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Moneda de Origen</label>
              <select
                value={idOrigen ?? ""}
                onChange={(e) => setIdOrigen(Number(e.target.value))}
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Selecciona</option>
                {monedas.map((m) => (
                  <option key={m.idMoneda} value={m.idMoneda}>
                    {m.codigo} — {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600">Moneda de Destino</label>
              <select
                value={idDestino ?? ""}
                onChange={(e) => setIdDestino(Number(e.target.value))}
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Selecciona</option>
                {monedas.map((m) => (
                  <option key={m.idMoneda} value={m.idMoneda}>
                    {m.codigo} — {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600">Tasa de Cambio</label>
              <input
                placeholder="Ej: 6.96"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mOrigen && mDestino && (
                <div className="text-xs text-slate-500 mt-1">
                  {mOrigen.codigo} → {mDestino.codigo}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-600">Fecha de Vigencia</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Impacto estimado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Impacto Estimado</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card title="Precios que suben" value={impacto?.items.filter((i) => (i.anterior ?? 0) < i.nuevo).length ?? 0} />
            <Card title="Precios que bajan" value={impacto?.items.filter((i) => (i.anterior ?? 0) > i.nuevo).length ?? 0} />
            <Card title="% Variación promedio" value={calcVariacionPromedio(impacto)} suffix="%" highlight />
            <Card title="Sin cambios" value={impacto?.iguales ?? 0} />
          </div>
        </div>
      </div>

      {/* Parámetros de redondeo */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Parámetros de Redondeo</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-600">Tipo de Redondeo</label>
            <select
              value={cfg.modo}
              onChange={(e) => setCfg((c: ConfigRedondeoDTO) => ({ ...c, modo: e.target.value as any }))}
              className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ENTERO">Al entero más cercano</option>
              <option value="MULTIPLO">Al múltiplo</option>
              <option value="DECIMALES">Por decimales</option>
              <option value="NINGUNO">Sin redondeo</option>
            </select>
          </div>

          {cfg.modo === "MULTIPLO" && (
            <div>
              <label className="text-sm text-slate-600">Múltiplo</label>
              <input
                type="number"
                step="0.01"
                value={cfg.multiplo ?? 0.5}
                onChange={(e) => setCfg((c) => ({ ...c, multiplo: Number(e.target.value) }))}
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {cfg.modo === "DECIMALES" && (
            <div>
              <label className="text-sm text-slate-600">Número de Decimales</label>
              <input
                type="number"
                value={cfg.decimales ?? 2}
                onChange={(e) => setCfg((c) => ({ ...c, decimales: Number(e.target.value) }))}
                className="w-full mt-1 rounded-lg bg-white px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={guardarRedondeo}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300"
          >
            Guardar parámetros
          </button>
        </div>
      </div>

      {/* Botones acción */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={simular}
          disabled={cargando || !idOrigen || !idDestino}
          className="px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >
          {cargando ? "Calculando..." : "Simular impacto"}
        </button>
        <button
          onClick={aplicar}
          disabled={cargando || !idOrigen || !idDestino}
          className="px-5 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {cargando ? "Aplicando..." : "Recalcular ahora"}
        </button>
      </div>

      <AjusteManualModal
        open={modalManual.open}
        onClose={() => setModalManual({ open: false, id: null })}
        idPresentacion={modalManual.id}
        sku={modalManual.sku}
        onSaved={() => {}}
      />
    </div>
  );
}

function Card({
  title,
  value,
  suffix = "",
  highlight = false,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-600">{title}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
        {suffix}
      </div>
    </div>
  );
}

function calcVariacionPromedio(imp: Impacto | null): number {
  if (!imp || imp.items.length === 0) return 0;
  const difs = imp.items
    .filter((i) => (i.anterior ?? 0) > 0)
    .map((i) => (((i.nuevo - (i.anterior ?? 0)) / (i.anterior ?? 1)) * 100));
  if (difs.length === 0) return 0;
  const avg = difs.reduce((a, b) => a + b, 0) / difs.length;
  return Math.round(avg * 10) / 10;
}
