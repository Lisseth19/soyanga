package com.soyanga.soyangabackend.repositorio.inventario.proy;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public interface MovimientoInventarioView {
    OffsetDateTime getFechaMovimiento();
    String getTipoMovimiento();
    BigDecimal getCantidad();
    String getAlmacenOrigen();
    String getAlmacenDestino();
    String getReferenciaModulo();
    Long getIdReferencia();
    String getObservaciones();
}
