export function diasHasta(fechaISO?: string | null): number | null {
  if (!fechaISO) return null;
  const hoy = new Date();
  const f = new Date(fechaISO + "T00:00:00");
  const msPorDia = 1000*60*60*24;
  return Math.floor((f.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime())/msPorDia);
}
