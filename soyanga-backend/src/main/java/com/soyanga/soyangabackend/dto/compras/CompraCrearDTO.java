package com.soyanga.soyangabackend.dto.compras;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompraCrearDTO {

    @NotNull(message = "idProveedor es requerido")
    private Long idProveedor;

    @NotNull(message = "idMoneda es requerido")
    private Long idMoneda; // usualmente USD

    @NotNull(message = "tipoCambioUsado es requerido")
    @DecimalMin(value = "0.000001", message = "tipoCambioUsado debe ser > 0")
    private BigDecimal tipoCambioUsado;

    // opcional: si no mandas, se usa now()
    private LocalDateTime fechaCompra;

    private String observaciones;
}
