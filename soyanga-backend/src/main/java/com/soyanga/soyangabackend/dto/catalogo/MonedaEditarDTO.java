package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MonedaEditarDTO {
    private String nombreMoneda;
    private Boolean esMonedaLocal;
}
