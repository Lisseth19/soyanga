package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PermisoCrearDTO {
    @NotBlank(message = "El nombre del permiso es requerido")
    private String nombrePermiso;
    private String descripcion;
    private Boolean estadoActivo;
}
