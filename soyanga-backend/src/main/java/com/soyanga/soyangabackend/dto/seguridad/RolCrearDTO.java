// src/main/java/com/soyanga/soyangabackend/dto/seguridad/RolCrearDTO.java
package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolCrearDTO {
    @NotBlank(message = "El nombre del rol es obligatorio")
    private String nombreRol;
    private String descripcion;
    private Boolean estadoActivo;
}
