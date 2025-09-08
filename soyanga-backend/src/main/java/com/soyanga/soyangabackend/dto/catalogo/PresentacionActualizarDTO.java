package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PresentacionActualizarDTO {
    private Long idUnidad;
    private BigDecimal contenidoPorUnidad;
    private String codigoSku;
    private BigDecimal costoBaseUsd;
    private BigDecimal margenVentaPorcentaje;
    private BigDecimal precioVentaBob;
    private Boolean estadoActivo;
}
