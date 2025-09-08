package com.soyanga.soyangabackend.dto.inventario;

import java.math.BigDecimal;

public interface TransferenciaItemProjection {
    Long getIdLote();
    String getNumeroLote();
    Long getIdPresentacion();
    String getSku();
    String getProducto();
    BigDecimal getCantidad();
}
