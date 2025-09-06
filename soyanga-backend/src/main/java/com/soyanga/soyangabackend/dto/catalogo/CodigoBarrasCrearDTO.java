package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CodigoBarrasCrearDTO {
    @NotBlank(message = "codigoBarras es requerido")
    private String codigoBarras;
    private String descripcion;
}
