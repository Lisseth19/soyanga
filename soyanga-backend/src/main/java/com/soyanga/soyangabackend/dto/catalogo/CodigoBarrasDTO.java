package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CodigoBarrasDTO {
    private Long idCodigoBarras;
    private Long idPresentacion;
    private String codigoBarras;
    private String descripcion;
}
