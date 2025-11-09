// src/main/java/com/soyanga/soyangabackend/dto/cobros/CxcDetalleDTO.java
package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CxcDetalleDTO {
    private Long idCuentaCobrar;
    private Long idVenta;
    private Long idCliente;
    private String cliente;

    private BigDecimal totalACobrar;     // aplicado + pendiente
    private BigDecimal totalAplicado;    // suma de aplicaciones
    private BigDecimal pendiente;        // estado actual

    private LocalDate fechaEmision;
    private LocalDate fechaVencimiento;
    private String estadoCuenta;

    private List<PagoLinea> pagos;       // historial

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PagoLinea {
        private Long idPago;
        private LocalDateTime fechaPago;
        private String metodoDePago;
        private String referenciaExterna;
        private BigDecimal montoPagoBob;     // opcional, informativo
        private BigDecimal aplicadoBob;      // lo que pegó a esta CxC
        private BigDecimal saldoDespues;     // saldo de la CxC luego de aplicar esta línea
    }
}
