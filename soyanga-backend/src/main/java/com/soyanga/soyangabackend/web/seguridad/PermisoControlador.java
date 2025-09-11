package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.PermisoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/seguridad/permisos")
@RequiredArgsConstructor
public class PermisoControlador {

    private final PermisoServicio servicio;

    @GetMapping
    public Page<PermisoRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public PermisoRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PermisoRespuestaDTO crear(@Valid @RequestBody PermisoCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public PermisoRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody PermisoEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    // Activar / Desactivar (rápidos)
    @PatchMapping("/{id}/activar")
    public PermisoRespuestaDTO activar(@PathVariable Long id) {
        return servicio.activar(id);
    }

    @PatchMapping("/{id}/desactivar")
    public PermisoRespuestaDTO desactivar(@PathVariable Long id) {
        return servicio.desactivar(id);
    }
}
