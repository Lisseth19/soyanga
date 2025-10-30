package com.soyanga.soyangabackend.dto.seguridad;

import java.time.LocalDateTime;

public interface AuditoriaListadoProjection {
    Long getIdAuditoria();

    LocalDateTime getFechaEvento();

    Long getIdUsuario();

    String getUsuario();

    String getModuloAfectado();

    String getAccion();

    Long getIdRegistroAfectado();

    String getDetalle();
}
