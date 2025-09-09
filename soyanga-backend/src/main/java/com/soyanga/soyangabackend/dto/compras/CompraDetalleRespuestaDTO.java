package com.soyanga.soyangabackend.dto.compras;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompraDetalleRespuestaDTO {
    private Long idCompraDetalle;
    private Long idPresentacion;
    private BigDecimal cantidad;
    private BigDecimal costoUnitarioMoneda;
    private LocalDate fechaEstimadaRecepcion;
}
