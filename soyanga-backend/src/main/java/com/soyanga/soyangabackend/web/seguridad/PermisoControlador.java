package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.PermisoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/seguridad/permisos")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'permisos:ver')") // todos los GET requieren permisos:ver
public class PermisoControlador {

    private final PermisoServicio servicio;

    @GetMapping
    public Page<PermisoRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("nombrePermiso").ascending());
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public PermisoRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    /** ⚠️ Recomendado solo para DEV; en PROD siembra por migraciones */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'permisos:crear')")
    public PermisoRespuestaDTO crear(@Valid @RequestBody PermisoCrearDTO dto) {
        return servicio.crear(dto);
    }

    /** Edita solo campos no-clave (no cambiar nombrePermiso) */
    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:actualizar')")
    public PermisoRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody PermisoEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    /** ⚠️ Recomendado solo para DEV; en PROD evita eliminar permisos sembrados */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'permisos:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    /** Activar/Desactivar con un solo endpoint */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:actualizar')")
    public PermisoRespuestaDTO cambiarEstado(@PathVariable Long id, @RequestBody CambiarEstadoReq req) {
        return servicio.cambiarEstado(id, req.activo());
    }

    /** Compatibilidad hacia atrás (deprecados) */
    @Deprecated
    @PatchMapping("/{id}/activar")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:actualizar')")
    public PermisoRespuestaDTO activar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, true);
    }

    @Deprecated
    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:actualizar')")
    public PermisoRespuestaDTO desactivar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, false);
    }

    public record CambiarEstadoReq(boolean activo) {}
}
