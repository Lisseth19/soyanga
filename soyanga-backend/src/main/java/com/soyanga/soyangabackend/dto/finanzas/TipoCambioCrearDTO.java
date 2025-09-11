package com.soyanga.soyangabackend.dto.finanzas;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TipoCambioCrearDTO {
    @NotNull(message = "idMonedaOrigen es requerido")
    private Long idMonedaOrigen;

    @NotNull(message = "idMonedaDestino es requerido")
    private Long idMonedaDestino;

    @NotNull(message = "fechaVigencia es requerida")
    private LocalDate fechaVigencia;

    @NotNull @DecimalMin(value = "0.000001", message = "tasaCambio debe ser > 0")
    private BigDecimal tasaCambio;
}
