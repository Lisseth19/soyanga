package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dominio.Auditoria;
import com.soyanga.soyangabackend.dto.seguridad.AuditoriaListadoProjection;
import com.soyanga.soyangabackend.repositorio.inventario.AuditoriaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditoriaServicio {
    private final AuditoriaRepositorio auditoriaRepo;

    public void registrar(Auditoria a) {
        if (a.getFechaEvento() == null)
            a.setFechaEvento(LocalDateTime.now());
        auditoriaRepo.save(a);
    }

    public Page<AuditoriaListadoProjection> listar(
            Long usuarioId, String modulo, String accion,
            String desde, String hasta, String q, Pageable pageable) {
        return auditoriaRepo.listar(usuarioId, modulo, accion, desde, hasta, q, pageable);
    }
}
