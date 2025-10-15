package com.soyanga.soyangabackend.dto.compras;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompraDetalleActualizarDTO {
    private BigDecimal cantidad; // opcional
    private BigDecimal costoUnitarioMoneda; // opcional
    private LocalDate fechaEstimadaRecepcion; // opcional (puede ser null para limpiar)
}
