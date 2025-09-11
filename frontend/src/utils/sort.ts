// src/utils/sort.ts
export type SortDir = "asc" | "desc";

export function parseSort(sort?: string) {
  const [f = "vencimiento", d = "asc"] = (sort || "").split(",");
  return { field: f, dir: d as SortDir };
}

export function buildSort(field: string, current?: string) {
  const cur = parseSort(current);
  return cur.field === field
    ? `${field},${cur.dir === "asc" ? "desc" : "asc"}`
    : `${field},asc`;
}

export function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
