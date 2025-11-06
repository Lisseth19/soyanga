package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.seguridad.Perms;
import com.soyanga.soyangabackend.servicio.seguridad.PermisoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/seguridad/permisos")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'permisos:ver')") // lectura por defecto
public class PermisoControlador {

    private final PermisoServicio servicio;
    private final Perms perms; // para validación fina en runtime

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

    /* ================== Estado (tres variantes) ================== */

    /** Variante conveniente (booleana) con chequeo fino por intención */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:activar') or @perms.tiene(authentication, 'permisos:desactivar')")
    public PermisoRespuestaDTO cambiarEstado(
            @PathVariable Long id,
            @RequestBody CambiarEstadoReq req,
            Authentication auth
    ) {
        boolean activar = req.activo();
        if (activar && !perms.tiene(auth, "permisos:activar")) {
            throw new AccessDeniedException("No tienes permiso para activar permisos");
        }
        if (!activar && !perms.tiene(auth, "permisos:desactivar")) {
            throw new AccessDeniedException("No tienes permiso para desactivar permisos");
        }
        return servicio.cambiarEstado(id, activar);
    }

    /** Activar explícito (permiso fino) */
    @PatchMapping("/{id}/activar")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:activar')")
    public PermisoRespuestaDTO activar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, true);
    }

    /** Desactivar explícito (permiso fino) */
    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("@perms.tiene(authentication, 'permisos:desactivar')")
    public PermisoRespuestaDTO desactivar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, false);
    }

    public record CambiarEstadoReq(boolean activo) {}
}
