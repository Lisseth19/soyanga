package com.soyanga.soyangabackend.dto.inventario;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface MovimientoTransferenciaProjection {
    Long getIdMovimiento();
    LocalDateTime getFechaMovimiento();
    String getTipoMovimiento();
    Long getIdLote();
    BigDecimal getCantidad();
    Long getIdAlmacenOrigen();
    Long getIdAlmacenDestino();
}
