// src/types/precios.ts

// Configuración de redondeo
export type ConfigRedondeoDTO = {
  modo: "ENTERO" | "MULTIPLO" | "DECIMALES" | "NINGUNO";
  multiplo?: number | null;
  decimales?: number | null;
};

// Resultado de simulación / aplicación de recálculo
export type RecalculoItem = {
  idPresentacion: number;
  sku: string;
  anterior: number | null;
  nuevo: number;
};

export type ResumenRecalculo = {
  cambiados: number;
  iguales: number;
  omitidos: number;
  items: RecalculoItem[];
};

// Historial
export type PrecioHistoricoDTO = {
  idPrecioHistorico: number;
  idPresentacion: number;
  precioVentaBob: number;
  fechaInicioVigencia: string;     // ISO
  fechaFinVigencia: string | null; // ISO
  motivoCambio: string | null;
  vigente: boolean;
  usuario?: string | null;         // si tu backend lo devuelve
};

export type FiltroHistoricoDTO = {
  sku?: string;
  desde?: string | null;  // ISO LocalDateTime
  hasta?: string | null;  // ISO LocalDateTime
  motivo?: string | null;
  usuario?: string | null;
};
// src/types/finanzas.ts
export type TipoCambioVigente = {
  idTipoCambio?: number;
  fechaVigencia?: string; // ISO date
  tasaCambio?: number;
  vigente?: boolean;
};
