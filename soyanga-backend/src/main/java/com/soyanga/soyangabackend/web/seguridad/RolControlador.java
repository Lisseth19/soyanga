package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.RolServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/seguridad/roles")
@RequiredArgsConstructor
public class RolControlador {

    private final RolServicio servicio;

    @GetMapping
    public Page<RolRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, pageable);
    }

    @GetMapping("/{id}")
    public RolRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RolRespuestaDTO crear(@Valid @RequestBody RolCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public RolRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody RolEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
    @PutMapping("/{id}/permisos")
    public RolRespuestaDTO asignarPermisos(@PathVariable Long id, @Valid @RequestBody RolAsignarPermisosDTO dto) {
        return servicio.asignarPermisos(id, dto);
    }

}
