package com.soyanga.soyangabackend.dto.inventario;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@lombok.Value
@lombok.Builder
public class MovimientoInventarioResponse {
    Long idMovimiento;          // agregado
    LocalDateTime fechaMovimiento;
    String tipoMovimiento;
    Long idLote;                // agregado
    BigDecimal cantidad;
    Long idAlmacenOrigen;       // agregado
    Long idAlmacenDestino;      // agregado
    String referenciaModulo;
    Long idReferencia;
    String observaciones;
    // Si además quieres nombres de almacén, déjalos como opcionales:
    String almacenOrigen;       // opcional (nombre)
    String almacenDestino;      // opcional (nombre)
}
