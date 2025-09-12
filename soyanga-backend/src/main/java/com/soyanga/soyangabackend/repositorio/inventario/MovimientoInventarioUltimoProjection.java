package com.soyanga.soyangabackend.repositorio.inventario;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface MovimientoInventarioUltimoProjection {
    Long getIdMovimiento();
    LocalDateTime getFechaMovimiento();
    String getTipoMovimiento();
    Long getIdLote();
    BigDecimal getCantidad();
    Long getIdAlmacenOrigen();
    Long getIdAlmacenDestino();
    String getReferenciaModulo();
    Long getIdReferencia();
}
