package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConversionDTO {
    private Long idMonedaOrigen;
    private Long idMonedaDestino;
    private BigDecimal montoOrigen;
    private BigDecimal tasaUsada;
    private BigDecimal montoDestino;
}
