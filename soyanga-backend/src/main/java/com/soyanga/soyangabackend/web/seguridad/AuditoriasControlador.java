package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.AuditoriaListadoProjection;
import com.soyanga.soyangabackend.servicio.inventario.AuditoriaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/seguridad/auditorias")
@RequiredArgsConstructor
public class AuditoriasControlador {

    private final AuditoriaServicio servicio;

    @GetMapping
    public Page<AuditoriaListadoProjection> listar(
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String desde, // "2025-10-01"
            @RequestParam(required = false) String hasta, // "2025-10-31"
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return servicio.listar(usuarioId, modulo, accion, desde, hasta, q, pageable);
    }
}
