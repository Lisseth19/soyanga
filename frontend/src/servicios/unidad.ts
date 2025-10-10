import { http } from "@/servicios/httpClient";
import type { Page } from "@/types/pagination"; // si ya tienes este tipo úsalo; si no, usa el Page que puse en types/unidad
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
  list(params: { q?: string; page?: number; size?: number; sort?: string }) {
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

  // Utilidad para exportar CSV de todas las páginas
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
    // arma CSV
    const header = ["ID", "Nombre", "Símbolo", "FactorBase"];
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [
          r.idUnidad,
          `"${(r.nombreUnidad || "").replace(/"/g, '""')}"`,
          `"${(r.simboloUnidad || "").replace(/"/g, '""')}"`,
          r.factorConversionBase ?? 1,
        ].join(",")
      )
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
  // Opciones para selects: usamos el símbolo como “nombre corto”
  async opciones(): Promise<Array<{ id: number; nombre: string }>> {
    const page = await http.get<Page<Unidad>>(base, {
      params: { size: 1000, sort: "nombreUnidad,asc" },
    });
    return page.content.map(u => ({ id: u.idUnidad, nombre: u.simboloUnidad || u.nombreUnidad }));
  },
};
