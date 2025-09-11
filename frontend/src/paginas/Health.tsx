// src/paginas/Health.tsx
import { useEffect, useState } from "react";
import { http, ApiError } from "@/servicios/httpClient";

// Si conoces la forma real, tipa aquí. Ejemplos comunes:
// type HealthResp = { ok: boolean } | { status: string } | Record<string, unknown>;
type HealthResp = unknown;

export default function Health() {
  // <- ahora puede ser null
  const [data, setData] = useState<HealthResp | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    http
      .get<HealthResp>("/api/health")
      .then(setData)
      .catch((e: unknown) => {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
            ? e.message
            : String(e);
        setErr(msg);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">API Health</h1>

      {err && <div className="text-red-600">Error: {err}</div>}
      {!data && !err && <div>Cargando…</div>}

      {/* Usa una condición BOOLEANA, no 'data && ...' con unknown */}
      {data !== null && (
        <pre className="p-4 rounded-lg border bg-neutral-50 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 shadow-sm overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
