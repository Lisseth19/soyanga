package com.soyanga.soyangabackend.dto.catalogo;

import java.math.BigDecimal;

public interface PresentacionEnAlmacenProjection {
    Long getIdPresentacion();
    String getSku();
    String getProducto();
    String getPresentacion();     // puede venir null si tu esquema no lo maneja
    String getUnidad();           // idem
    BigDecimal getStockDisponible();
    BigDecimal getReservado();
    BigDecimal getPrecioBob();
    String getImagenUrl();
    String getLoteNumero();
    String getLoteVencimiento();
    BigDecimal getLoteDisponible();

}
