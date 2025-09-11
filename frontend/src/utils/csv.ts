export function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v:any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g,'""');
    return `"${s}"`;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h=>esc((r as any)[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
