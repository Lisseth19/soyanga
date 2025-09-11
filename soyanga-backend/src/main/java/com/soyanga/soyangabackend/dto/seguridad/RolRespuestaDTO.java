package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolRespuestaDTO {
    private Long idRol;
    private String nombreRol;
    private String descripcion;

    List<Long> permisos;
}
