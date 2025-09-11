package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PermisoRespuestaDTO {
    private Long idPermiso;
    private String nombrePermiso;
    private String descripcion;
    private Boolean estadoActivo;
}
