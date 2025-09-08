package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PagoAplicarRespuestaDTO {
    private Long idPago;
    private int aplicaciones;
    private BigDecimal totalAplicado;
    private List<Linea> detalle;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Linea {
        private Long idCuentaCobrar;
        private BigDecimal antes;
        private BigDecimal aplicado;
        private BigDecimal despues;
        private String estadoCxc;
    }
}
