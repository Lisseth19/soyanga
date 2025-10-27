package com.soyanga.soyangabackend.dto.cobros;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnticipoCrearDTO {
    @NotNull(message = "idCliente es requerido")
    private Long idCliente;

    @NotNull(message = "montoBob es requerido")
    @DecimalMin(value = "0.01", message = "montoBob debe ser > 0")
    private BigDecimal montoBob;

    private String observaciones;

}
