package com.soyanga.soyangabackend.dto.ventas;

import java.math.BigDecimal;

public interface LoteCantidadProjection {
    Long getIdLote();
    BigDecimal getCantidad();
}
