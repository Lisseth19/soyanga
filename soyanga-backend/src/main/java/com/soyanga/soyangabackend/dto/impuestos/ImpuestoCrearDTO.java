package com.soyanga.soyangabackend.dto.impuestos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ImpuestoCrearDTO {
    @NotBlank(message = "El nombre del impuesto es requerido")
    private String nombreImpuesto;

    @DecimalMin(value = "0.0", message = "El porcentaje debe ser >= 0")
    private BigDecimal porcentaje;

    // opcional, si no envías tomamos true
    private Boolean estadoActivo;
}
