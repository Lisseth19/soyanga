package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PresentacionLookupDTO {
    private Long idPresentacion;
    private String codigoSku;
    private Long idProducto;
    private String nombreProducto;
    private Long idUnidad;
    private String simboloUnidad;
    private BigDecimal contenidoPorUnidad;

    // precio vigente (si existe)
    private BigDecimal precioVigenteBob;
    private LocalDateTime precioVigenteInicio;
}
