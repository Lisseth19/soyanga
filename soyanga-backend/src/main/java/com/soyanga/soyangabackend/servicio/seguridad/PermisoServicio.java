package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dominio.Permiso;
import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.repositorio.seguridad.PermisoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PermisoServicio {

    private final PermisoRepositorio repo;

    @Transactional(readOnly = true)
    public Page<PermisoRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        var page = repo.buscar(normaliza(q), soloActivos, pageable);
        return page.map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public PermisoRespuestaDTO obtener(Long id) {
        var p = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));
        return toDTO(p);
    }

    /**
     *  Solo útil en entorno de desarrollo si decides no sembrar por migraciones.
     * En producción, crea permisos por Flyway/Liquibase (seed) y deshabilita este método.
     */
    @Deprecated
    @Transactional
    public PermisoRespuestaDTO crear(PermisoCrearDTO dto) {
        var nombre = dto.getNombrePermiso() == null ? "" : dto.getNombrePermiso().trim();
        if (nombre.isEmpty()) throw new IllegalArgumentException("El nombre del permiso es obligatorio");
        var p = Permiso.builder()
                .nombrePermiso(nombre)
                .descripcion(dto.getDescripcion())
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();
        try {
            p = repo.save(p);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Ya existe un permiso con ese nombre");
        }
        return toDTO(p);
    }

    /**
     * Edita SOLO campos no-clave. No permite cambiar nombrePermiso para mantener integridad con hasAuthority(...).
     */
    @Transactional
    public PermisoRespuestaDTO editar(Long id, PermisoEditarDTO dto) {
        var p = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));

        if (dto.getDescripcion() != null) {
            p.setDescripcion(dto.getDescripcion());
        }
        if (dto.getEstadoActivo() != null) {
            p.setEstadoActivo(dto.getEstadoActivo());
        }

        // Ignorar silenciosamente cambios al nombre (si llegaran)
        // if (dto.getNombrePermiso() != null) { /* NO CAMBIAR */ }

        try {
            p = repo.save(p);
        } catch (DataIntegrityViolationException e) {
            // Safety — no debería dispararse si no tocamos nombre, pero por si acaso
            throw new IllegalArgumentException("Conflicto al guardar el permiso");
        }
        return toDTO(p);
    }

    /**
     *  Solo dev. En prod evita eliminar permisos sembrados por migraciones.
     */
    @Deprecated
    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    /** Unifica activar/desactivar en un solo método */
    @Transactional
    public PermisoRespuestaDTO cambiarEstado(Long id, boolean activo) {
        var p = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));
        p.setEstadoActivo(activo);
        return toDTO(repo.save(p));
    }

    // ---- helpers ----
    private String normaliza(String s) {
        return (s == null) ? "" : s.trim();
    }
    private PermisoRespuestaDTO toDTO(Permiso p) {
        return PermisoRespuestaDTO.builder()
                .idPermiso(p.getIdPermiso())
                .nombrePermiso(p.getNombrePermiso())
                .descripcion(p.getDescripcion())
                .estadoActivo(p.getEstadoActivo())
                .build();
    }
}
