// src/main/java/com/soyanga/soyangabackend/dto/cobros/CxcPagoLineaProjection.java
package com.soyanga.soyangabackend.dto.cobros;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface CxcPagoLineaProjection {
    Long getIdPagoRecibido();
    LocalDateTime getFechaPago();
    String getMetodoDePago();
    String getReferenciaExterna();
    BigDecimal getMontoPagoBob();       // Monto del pago (equivalente en BOB)
    BigDecimal getMontoAplicadoBob();   // Monto aplicado a esta CxC
}
