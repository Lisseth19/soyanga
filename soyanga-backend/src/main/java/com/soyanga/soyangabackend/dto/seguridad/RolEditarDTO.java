package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolEditarDTO {
    @NotBlank(message = "El nombre del rol es requerido")
    private String nombreRol;
    private String descripcion;
}
