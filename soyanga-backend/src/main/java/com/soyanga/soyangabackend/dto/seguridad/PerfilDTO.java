package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

import java.util.Set;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PerfilDTO {
    private Long   idUsuario;
    private String nombreCompleto;
    private String nombreUsuario;
    private String correoElectronico;
    private Boolean estadoActivo;
    private Set<String> roles;       // p.ej. ["ADMIN","VENTAS"]
    private Set<String> permisos;    // p.ej. ["ventas:listar","ventas:crear"]
}
