package com.soyanga.soyangabackend.dto.inventario;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@lombok.Value
@lombok.Builder
public class MovimientoInventarioResponse {
    LocalDateTime fechaMovimiento;
    String tipoMovimiento;
    BigDecimal cantidad;
    String almacenOrigen;
    String almacenDestino;
    String referenciaModulo;
    Long idReferencia;
    String observaciones;
}
