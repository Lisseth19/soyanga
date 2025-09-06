package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategoriaCrearDTO {
    @NotBlank(message = "El nombre es requerido")
    private String nombreCategoria;
    private String descripcion;
    private Long idCategoriaPadre;
}
