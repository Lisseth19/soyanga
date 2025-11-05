export type AlertaTipo =
  | "stock_agotado"
  | "stock_bajo"
  | "vencido"
  | "vencimiento_inminente"
  | "vencimiento_proximo";

export type AlertaSeveridad = "urgente" | "advertencia" | "proximo";

export interface AlertaItem {
  // IDs base
  idAlerta: number;
  idAlmacen: number;
  idLote: number;
  idPresentacion: number;

  // Identidad
  producto: string;
  sku: string;
  numeroLote: string;
  almacen: string;

  // Stock
  stockDisponible: number;
  stockReservado: number;
  stockMinimo: number;

  // Vencimiento
  venceEl: string | null;         // ISO ó null
  diasRestantes: number | null;   // días (negativo si ya venció) o null

  // Clasificación
  tipo: AlertaTipo;
  severidad: AlertaSeveridad;
  prioridad: number;              // 100,95,90,80,60,0
  motivo: string | null;

   // NUEVO: para detectar cambios y notificar
  estadoHash?: string;
}

export interface AlertasQuery {
  tipo?: AlertaTipo;
  severidad?: AlertaSeveridad;
  almacenId?: number;
  q?: string;
  page?: number; // 0-based
  size?: number;
}
export interface AlertasResumen {
  total: number;
  porSeveridad: Record<string, number>;
  porTipo: Record<string, number>;
  top: AlertaItem[]; // incluye estadoHash
}