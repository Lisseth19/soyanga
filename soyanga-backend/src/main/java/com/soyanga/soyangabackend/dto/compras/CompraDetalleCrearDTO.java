package com.soyanga.soyangabackend.dto.compras;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompraDetalleCrearDTO {
    @NotNull(message = "idPresentacion es requerido")
    private Long idPresentacion;

    @NotNull(message = "cantidad es requerida")
    @DecimalMin(value = "0.000001", message = "cantidad debe ser > 0")
    private BigDecimal cantidad;

    @NotNull(message = "costoUnitarioMoneda es requerido")
    @DecimalMin(value = "0.0", message = "costoUnitarioMoneda no puede ser negativo")
    private BigDecimal costoUnitarioMoneda;

    // opcional
    private LocalDate fechaEstimadaRecepcion;
}
