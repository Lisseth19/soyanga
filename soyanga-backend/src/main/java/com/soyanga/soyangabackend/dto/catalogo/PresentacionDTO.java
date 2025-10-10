package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PresentacionDTO {
    private Long idPresentacion;
    private Long idProducto;
    private Long idUnidad;
    private BigDecimal contenidoPorUnidad;
    private String codigoSku;
    private BigDecimal costoBaseUsd;
    private BigDecimal margenVentaPorcentaje;
    private BigDecimal precioVentaBob;
    private Boolean estadoActivo;
    private String imagenUrl;
}
