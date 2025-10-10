package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.UsuarioServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/seguridad/usuarios")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'usuarios:ver')") // lectura por defecto
public class UsuarioControlador {

    private final UsuarioServicio servicio;

    @GetMapping
    public Page<UsuarioRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public UsuarioRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'usuarios:crear')")
    public UsuarioRespuestaDTO crear(@Valid @RequestBody UsuarioCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'usuarios:actualizar')")
    public UsuarioRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody UsuarioEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'usuarios:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    @PutMapping("/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'usuarios:actualizar')")
    public void cambiarPassword(@PathVariable Long id, @Valid @RequestBody UsuarioCambiarPasswordDTO dto) {
        servicio.cambiarPassword(id, dto);
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("@perms.tiene(authentication, 'usuarios:actualizar')")
    public UsuarioRespuestaDTO asignarRoles(@PathVariable Long id, @Valid @RequestBody UsuarioAsignarRolesDTO dto) {
        return servicio.asignarRoles(id, dto);
    }

    @PatchMapping("/{id}/estado")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'usuarios:actualizar')")
    public void cambiarEstado(@PathVariable Long id, @RequestParam boolean activo) {
        servicio.cambiarEstado(id, activo);
    }
}
