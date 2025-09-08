package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnidadCrearDTO {
    @NotBlank(message = "nombreUnidad es requerido")
    private String nombreUnidad;
    @NotBlank(message = "simboloUnidad es requerido")
    private String simboloUnidad;

    @DecimalMin(value = "0.000001", message = "factorConversionBase debe ser > 0")
    private BigDecimal factorConversionBase;
}
