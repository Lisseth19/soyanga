package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PresentacionCrearDTO {

    @NotNull(message = "idProducto es requerido")
    private Long idProducto;

    @NotNull(message = "idUnidad es requerido")
    private Long idUnidad;

    @NotNull(message = "contenidoPorUnidad es requerido")
    @DecimalMin(value = "0.000001", message = "contenidoPorUnidad debe ser > 0")
    private BigDecimal contenidoPorUnidad;

    @NotBlank(message = "codigoSku es requerido")
    private String codigoSku;

    @DecimalMin(value = "0", message = "costoBaseUsd no puede ser negativo")
    private BigDecimal costoBaseUsd;

    @DecimalMin(value = "0", message = "margenVentaPorcentaje no puede ser negativo")
    private BigDecimal margenVentaPorcentaje;

    @DecimalMin(value = "0", message = "precioVentaBob no puede ser negativo")
    private BigDecimal precioVentaBob;
}
