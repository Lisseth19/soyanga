package com.soyanga.soyangabackend.dto.cobros;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface CxcListadoProjection {
    Long getIdCuentaCobrar();
    Long getIdVenta();
    Long getIdCliente();
    String getCliente();
    BigDecimal getMontoPendienteBob();
    LocalDate getFechaEmision();
    LocalDate getFechaVencimiento();
    String getEstadoCuenta();
}
