package com.soyanga.soyangabackend.dto.compras;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecepcionItemDTO {

    @NotNull(message = "idCompraDetalle es requerido")
    private Long idCompraDetalle;

    @NotNull(message = "idPresentacion es requerido")
    private Long idPresentacion;

    @NotNull(message = "cantidadRecibida es requerida")
    @DecimalMin(value = "0.000001", message = "cantidadRecibida debe ser > 0")
    private BigDecimal cantidadRecibida;

    @NotNull(message = "costoUnitarioMoneda es requerido")
    @DecimalMin(value = "0", message = "costoUnitarioMoneda no puede ser negativo")
    private BigDecimal costoUnitarioMoneda;

    @NotNull(message = "numeroLote es requerido")
    private String numeroLote;

    private LocalDate fechaFabricacion;

    @NotNull(message = "fechaVencimiento es requerida")
    private LocalDate fechaVencimiento;

    private String observaciones;
}
