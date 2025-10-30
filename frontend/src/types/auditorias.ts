export interface AuditoriaItem {
  idAuditoria: number;
  fechaEvento: string;               // ISO date
  idUsuario: number | null;
  usuario?: string | null;           // ← nombre amigable (viene del repo)
  moduloAfectado: string;
  accion: string;
  idRegistroAfectado: number | null;
  detalle: string | null;
}

export interface AuditoriaQuery {
  usuarioId?: number;
  modulo?: string;
  accion?: string;
  desde?: string;  // 'YYYY-MM-DD'
  hasta?: string;  // 'YYYY-MM-DD'
  q?: string;
  page?: number;
  size?: number;
}

