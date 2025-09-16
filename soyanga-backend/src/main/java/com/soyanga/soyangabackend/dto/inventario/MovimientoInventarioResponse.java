package com.soyanga.soyangabackend.dto.inventario;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class MovimientoInventarioResponse {
    Long idMovimiento;
    LocalDateTime fechaMovimiento;
    String tipoMovimiento;
    Long idLote;
    BigDecimal cantidad;

    Long idAlmacenOrigen;
    Long idAlmacenDestino;

    String referenciaModulo;
    Long idReferencia;

    // NUEVOS: nombres resueltos
    String almacenOrigen;
    String almacenDestino;

    // opcional
    String observaciones;
}
