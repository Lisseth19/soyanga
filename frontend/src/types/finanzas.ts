// src/types/finanzas.ts
export type TipoCambioVigente = {
  idTipoCambio?: number;
  fechaVigencia?: string; // ISO date
  tasaCambio?: number;
  vigente?: boolean;
};
