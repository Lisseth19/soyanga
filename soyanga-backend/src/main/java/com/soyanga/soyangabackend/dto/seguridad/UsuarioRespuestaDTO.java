package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioRespuestaDTO {
    private Long idUsuario;
    private String nombreCompleto;
    private String correoElectronico;
    private String telefono;
    private String nombreUsuario;
    private Boolean estadoActivo;
    private List<RolMiniDTO> roles;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RolMiniDTO {
        private Long idRol;
        private String nombreRol;
    }
}
