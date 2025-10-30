package com.soyanga.soyangabackend.dto.seguridad;

import java.time.LocalDateTime;

public record AuditoriaDTO(
        Long idAuditoria,
        LocalDateTime fechaEvento,
        Long idUsuario,
        String moduloAfectado,
        String accion,
        Long idRegistroAfectado,
        String detalle) {
}
