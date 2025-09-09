package com.soyanga.soyangabackend.dto.compras;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface CompraListadoProjection {
    Long getIdCompra();
    LocalDateTime getFechaCompra();
    String getEstadoCompra();
    Long getIdProveedor();
    String getProveedor();
    Long getIdMoneda();
    BigDecimal getTipoCambioUsado();
    Integer getTotalItems();
    BigDecimal getTotalMoneda();
}
