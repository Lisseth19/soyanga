// src/main/java/com/soyanga/soyangabackend/dto/seguridad/RolEditarDTO.java
package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolEditarDTO {
    @NotBlank(message = "El nombre del rol es obligatorio")
    private String nombreRol;
    private String descripcion;
    private Boolean estadoActivo;
}
