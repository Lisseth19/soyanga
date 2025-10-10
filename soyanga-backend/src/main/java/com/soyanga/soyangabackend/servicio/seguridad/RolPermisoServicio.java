// src/main/java/com/soyanga/soyangabackend/servicio/seguridad/RolPermisoServicio.java
package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dominio.Rol;
import com.soyanga.soyangabackend.dominio.RolPermiso;
import com.soyanga.soyangabackend.dto.seguridad.PermisoRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.seguridad.PermisoRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.RolPermisoRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.RolRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class RolPermisoServicio {

    private final RolRepositorio rolRepo;
    private final PermisoRepositorio permisoRepo;
    private final RolPermisoRepositorio rolPermisoRepo;

    @Transactional(readOnly = true)
    public List<PermisoRespuestaDTO> listarPorRol(Long rolId) {
        var links = rolPermisoRepo.findByIdRol(rolId);
        var permisos = links.stream()
                .map(l -> permisoRepo.findById(l.getIdPermiso()).orElse(null))
                .filter(p -> p != null && Boolean.TRUE.equals(p.getEstadoActivo()))
                .toList();

        return permisos.stream()
                .map(p -> PermisoRespuestaDTO.builder()
                        .idPermiso(p.getIdPermiso())
                        .nombrePermiso(p.getNombrePermiso())
                        .descripcion(p.getDescripcion())
                        .estadoActivo(p.getEstadoActivo())
                        .build()
                )
                .toList();
    }

    public void asignar(Long rolId, Long permisoId) {
        var rol = rolRepo.findById(rolId)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + rolId));
        if (Boolean.FALSE.equals(rol.getEstadoActivo())) {
            throw new IllegalStateException("No se puede asignar a un rol inactivo");
        }
        var permiso = permisoRepo.findById(permisoId)
                .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + permisoId));
        if (!Boolean.TRUE.equals(permiso.getEstadoActivo())) {
            throw new IllegalStateException("No se puede asignar un permiso inactivo");
        }
        if (!rolPermisoRepo.existsByIdRolAndIdPermiso(rolId, permisoId)) {
            rolPermisoRepo.save(RolPermiso.builder().idRol(rolId).idPermiso(permisoId).build());
        }
    }

    public void quitar(Long rolId, Long permisoId) {
        rolPermisoRepo.deleteByIdRolAndIdPermiso(rolId, permisoId);
    }

    /** Reemplaza TODO el set de permisos del rol por los provistos (idempotente). */
    public void reemplazarPermisos(Long rolId, List<Long> nuevosPermisoIds) {
        var rol = rolRepo.findById(rolId)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + rolId));
        if (Boolean.FALSE.equals(rol.getEstadoActivo())) {
            throw new IllegalStateException("Rol inactivo");
        }

        // Normaliza entrada
        var destino = (nuevosPermisoIds == null) ? Collections.<Long>emptySet() : new LinkedHashSet<>(nuevosPermisoIds);

        // Valida que todos existan y estén activos
        for (Long pid : destino) {
            var p = permisoRepo.findById(pid)
                    .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + pid));
            if (!Boolean.TRUE.equals(p.getEstadoActivo())) {
                throw new IllegalStateException("Permiso inactivo: " + p.getNombrePermiso());
            }
        }

        // Carga actual
        var actuales = rolPermisoRepo.findByIdRol(rolId);
        var actualesSet = new LinkedHashSet<Long>();
        for (var link : actuales) actualesSet.add(link.getIdPermiso());

        // Calcula diferencias
        var aEliminar = new LinkedHashSet<>(actualesSet);
        aEliminar.removeAll(destino); // están pero ya no deben estar

        var aAgregar = new LinkedHashSet<>(destino);
        aAgregar.removeAll(actualesSet); // no están y deben agregarse

        // Ejecuta cambios
        for (Long pid : aEliminar) {
            rolPermisoRepo.deleteByIdRolAndIdPermiso(rolId, pid);
        }
        for (Long pid : aAgregar) {
            rolPermisoRepo.save(RolPermiso.builder().idRol(rolId).idPermiso(pid).build());
        }
    }
}
