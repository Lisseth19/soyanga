package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategoriaActualizarDTO {
    private String nombreCategoria;
    private String descripcion;
    private Long idCategoriaPadre;
}
