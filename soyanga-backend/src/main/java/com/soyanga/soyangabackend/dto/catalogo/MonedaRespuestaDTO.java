package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MonedaRespuestaDTO {
    private Long idMoneda;
    private String codigoMoneda;
    private String nombreMoneda;
    private Boolean esMonedaLocal;
}
