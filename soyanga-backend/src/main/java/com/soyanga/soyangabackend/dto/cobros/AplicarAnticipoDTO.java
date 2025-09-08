package com.soyanga.soyangabackend.dto.cobros;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AplicarAnticipoDTO {

    @NotNull(message = "idVenta es requerido")
    private Long idVenta;

    @NotNull(message = "montoAplicadoBob es requerido")
    @DecimalMin(value = "0.01", message = "montoAplicadoBob debe ser > 0")
    private BigDecimal montoAplicadoBob;
}
