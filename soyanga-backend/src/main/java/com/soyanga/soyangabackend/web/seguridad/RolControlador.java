package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.RolServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/seguridad/roles")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'roles:ver')") // lectura del recurso
public class RolControlador {

    private final RolServicio servicio;

    @GetMapping
    public Page<RolRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return servicio.listar(q, PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public RolRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'roles:crear')")
    public RolRespuestaDTO crear(@Valid @RequestBody RolCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'roles:actualizar')")
    public RolRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody RolEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'roles:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    //  GET permisos del rol
    @GetMapping("/{id}/permisos")
    public List<PermisoRespuestaDTO> listarPermisos(@PathVariable Long id) {
        return servicio.listarPermisosDelRol(id);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("@perms.tiene(authentication, 'roles:actualizar')")
    public RolRespuestaDTO cambiarEstado(@PathVariable Long id, @Valid @RequestBody RolEstadoDTO dto) {
        return servicio.cambiarEstado(id, dto);
    }

    // Reemplazo total de permisos del rol
    @PutMapping("/{id}/permisos")
    @PreAuthorize("@perms.tiene(authentication, 'roles:actualizar')")
    public RolRespuestaDTO asignarPermisos(@PathVariable Long id, @Valid @RequestBody RolAsignarPermisosDTO dto) {
        return servicio.asignarPermisos(id, dto);
    }
}
