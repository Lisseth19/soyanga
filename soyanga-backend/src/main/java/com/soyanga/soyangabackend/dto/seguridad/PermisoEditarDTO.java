package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PermisoEditarDTO {
    private String nombrePermiso;
    private String descripcion;
    private Boolean estadoActivo;
}
