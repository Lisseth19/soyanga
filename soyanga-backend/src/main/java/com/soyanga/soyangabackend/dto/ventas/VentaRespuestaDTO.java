package com.soyanga.soyangabackend.dto.ventas;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VentaRespuestaDTO {
    private Long idVenta;
    private BigDecimal totalBrutoBob;
    private BigDecimal descuentoTotalBob;
    private BigDecimal totalNetoBob;

    // NUEVO (opcionales, informativos)
    private BigDecimal impuestoPorcentaje;
    private BigDecimal impuestoMontoBob;
    private BigDecimal interesCredito;

    private List<ItemAsignado> asignaciones; // breakdown por lotes (opcional para debug)

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ItemAsignado {
        private Long idPresentacion;
        private String sku;
        private String producto;
        private String numeroLote;
        private String vencimiento;
        private BigDecimal cantidad;
        private BigDecimal precioUnitarioBob;
        private BigDecimal subtotalBob;
    }
}
