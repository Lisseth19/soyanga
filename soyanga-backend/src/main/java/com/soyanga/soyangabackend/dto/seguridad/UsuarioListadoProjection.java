package com.soyanga.soyangabackend.dto.seguridad;

public interface UsuarioListadoProjection {
    Long getIdUsuario();
    String getNombreCompleto();
    String getCorreoElectronico();
    String getTelefono();
    String getNombreUsuario();
    Boolean getEstadoActivo();
}
