// src/servicios/unidad.ts
import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination";
import type { Unidad, UnidadCrearDTO, UnidadActualizarDTO } from "@/types/unidad";

const base = "/v1/catalogo/unidades";

function clean(params: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const unidadService = {
  list(params: { q?: string; page?: number; size?: number; sort?: string } = {}) {
    return http.get<Page<Unidad>>(base, { params: clean(params) });
  },

  get(id: number) {
    return http.get<Unidad>(`${base}/${id}`);
  },

  create(dto: UnidadCrearDTO) {
    return http.post<Unidad, UnidadCrearDTO>(base, dto);
  },

  update(id: number, dto: UnidadActualizarDTO) {
    return http.put<Unidad, UnidadActualizarDTO>(`${base}/${id}`, dto);
  },

  remove(id: number) {
    return http.del<void>(`${base}/${id}`);
  },

  // ===== Exportar CSV de todas las páginas (ordenado por nombre)
  async exportCsv(q?: string) {
    let page = 0;
    const size = 200;
    const rows: Unidad[] = [];
    // pagina todas
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await unidadService.list({ q, page, size, sort: "nombreUnidad,asc" });
      rows.push(...res.content);
      if (res.last || res.content.length === 0) break;
      page += 1;
    }

    const header = ["ID", "Nombre", "Símbolo", "FactorBase"];
    const lines = [header.join(",")].concat(
        rows.map((r) =>
            [
              r.idUnidad,
              `"${(r.nombreUnidad || "").replace(/"/g, '""')}"`,
              `"${(r.simboloUnidad || "").replace(/"/g, '""')}"`,
              r.factorConversionBase ?? 1,
            ].join(","),
        ),
    );

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unidades.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ===== Opciones para selects (usa /opciones del backend)
  // Devuelve [{ id, nombre }], usando símbolo si existe, si no el nombre completo.
  async opciones(q?: string, size = 1000): Promise<Array<{ id: number; nombre: string }>> {
    // Si quieres filtrar por q, el backend lo soporta (ver controlador con @GetMapping("/opciones"))
    const result = await http.get<Array<{ id: number; nombre: string }>>(
        `${base}/opciones`,
        { params: clean({ q, size }) },
    );
    return result;
  },
};
