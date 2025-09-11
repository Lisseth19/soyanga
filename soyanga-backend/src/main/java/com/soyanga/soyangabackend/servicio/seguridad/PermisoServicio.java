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

    public Page<PermisoRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        var page = repo.buscar(normaliza(q), soloActivos, pageable);
        return page.map(this::toDTO);
    }

    public PermisoRespuestaDTO obtener(Long id) {
        var p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));
        return toDTO(p);
    }

    @Transactional
    public PermisoRespuestaDTO crear(PermisoCrearDTO dto) {
        var p = Permiso.builder()
                .nombrePermiso(dto.getNombrePermiso().trim())
                .descripcion(dto.getDescripcion())
                .estadoActivo(dto.getEstadoActivo() == null ? true : dto.getEstadoActivo())
                .build();
        try {
            p = repo.save(p);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Ya existe un permiso con ese nombre");
        }
        return toDTO(p);
    }

    @Transactional
    public PermisoRespuestaDTO editar(Long id, PermisoEditarDTO dto) {
        var p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));
        if (dto.getNombrePermiso() != null) p.setNombrePermiso(dto.getNombrePermiso().trim());
        if (dto.getDescripcion() != null) p.setDescripcion(dto.getDescripcion());
        if (dto.getEstadoActivo() != null) p.setEstadoActivo(dto.getEstadoActivo());
        try {
            p = repo.save(p);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Ya existe un permiso con ese nombre");
        }
        return toDTO(p);
    }

    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    @Transactional
    public PermisoRespuestaDTO activar(Long id) {
        var p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));
        p.setEstadoActivo(true);
        return toDTO(repo.save(p));
    }

    @Transactional
    public PermisoRespuestaDTO desactivar(Long id) {
        var p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + id));
        p.setEstadoActivo(false);
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
