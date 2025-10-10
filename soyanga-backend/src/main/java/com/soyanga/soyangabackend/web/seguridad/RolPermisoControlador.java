package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.PermisoRespuestaDTO;
import com.soyanga.soyangabackend.seguridad.RequiereVer;
import com.soyanga.soyangabackend.seguridad.RequiereCrear;
import com.soyanga.soyangabackend.seguridad.RequiereActualizar;
import com.soyanga.soyangabackend.seguridad.RequiereEliminar;
import com.soyanga.soyangabackend.servicio.seguridad.RolPermisoServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/roles/{rolId}/permisos")
@PreAuthorize("@perms.tiene(authentication, 'roles:ver')")
public class RolPermisoControlador {

    private final RolPermisoServicio servicio;

    @GetMapping
    public List<PermisoRespuestaDTO> listar(@PathVariable Long rolId) {
        return servicio.listarPorRol(rolId);
    }

    @PostMapping("/{permisoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'roles:crear')")
    public void asignar(@PathVariable Long rolId, @PathVariable Long permisoId) {
        servicio.asignar(rolId, permisoId);
    }

    @DeleteMapping("/{permisoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'roles:eliminar')")
    public void quitar(@PathVariable Long rolId, @PathVariable Long permisoId) {
        servicio.quitar(rolId, permisoId);
    }

    @PutMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'roles:actualizar')")
    public void reemplazar(@PathVariable Long rolId, @RequestBody List<Long> permisoIds) {
        servicio.reemplazarPermisos(rolId, permisoIds);
    }
}

