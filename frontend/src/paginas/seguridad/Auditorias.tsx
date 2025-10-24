// src/paginas/seguridad/Auditorias.tsx
import { useState } from "react";

export default function AuditoriasPage() {
  // placeholder simple hasta conectar backend
  const [filtro, setFiltro] = useState({ q: "", desde: "", hasta: "" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Auditorías</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Buscar por usuario, acción, módulo…"
          value={filtro.q}
          onChange={(e) => setFiltro({ ...filtro, q: e.target.value })}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={filtro.desde}
          onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={filtro.hasta}
          onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })}
        />
        <button className="rounded bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">
          Filtrar
        </button>
      </div>

      <div className="rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Fecha/Hora</th>
              <th className="p-2 text-left">Usuario</th>
              <th className="p-2 text-left">Módulo</th>
              <th className="p-2 text-left">Acción</th>
              <th className="p-2 text-left">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-500">
                Sin registros (pendiente de backend).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
