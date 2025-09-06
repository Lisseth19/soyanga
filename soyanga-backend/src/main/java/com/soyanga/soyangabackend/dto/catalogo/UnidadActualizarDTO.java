package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnidadActualizarDTO {
    private String nombreUnidad;
    private String simboloUnidad;
    private BigDecimal factorConversionBase;
}
