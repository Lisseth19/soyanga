package com.soyanga.soyangabackend.dto.impuestos;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ImpuestoRespuestaDTO {
    private Long idImpuesto;
    private String nombreImpuesto;
    private BigDecimal porcentaje;
    private Boolean estadoActivo;
}
