package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Sucursal;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.dto.sucursales.*;
import com.soyanga.soyangabackend.repositorio.catalogo.SucursalRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SucursalServicio {

    private final SucursalRepositorio repo;

    /** Listar con filtro de incluirInactivos (igual al patrón de Almacenes). */
    public Page<SucursalRespuestaDTO> listar(String q, String ciudad, boolean incluirInactivos, Pageable pageable) {
        String filtroQ = (q == null || q.isBlank()) ? null : q.trim();
        String filtroCiudad = (ciudad == null || ciudad.isBlank()) ? null : ciudad.trim();

        var page = repo.listar(filtroQ, filtroCiudad, incluirInactivos, pageable);
        return page.map(p -> SucursalRespuestaDTO.builder()
                .idSucursal(p.getIdSucursal())
                .nombreSucursal(p.getNombreSucursal())
                .direccion(p.getDireccion())
                .ciudad(p.getCiudad())
                .estadoActivo(p.getEstadoActivo())
                .build());
    }

    public SucursalRespuestaDTO obtener(Long id) {
        var e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Sucursal no encontrada: " + id));
        return toDTO(e);
    }

    public SucursalRespuestaDTO crear(SucursalCrearDTO dto) {
        var e = Sucursal.builder()
                .nombreSucursal(dto.getNombreSucursal())
                .direccion(dto.getDireccion())
                .ciudad(dto.getCiudad())
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();
        e = repo.save(e);
        return toDTO(e);
    }

    public SucursalRespuestaDTO editar(Long id, SucursalEditarDTO dto) {
        var e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Sucursal no encontrada: " + id));
        e.setNombreSucursal(dto.getNombreSucursal());
        e.setDireccion(dto.getDireccion());
        e.setCiudad(dto.getCiudad());
        if (dto.getEstadoActivo() != null) {
            e.setEstadoActivo(dto.getEstadoActivo());
        }
        e = repo.save(e);
        return toDTO(e);
    }

    /** Cambiar estado vía UPDATE directo (performante y consistente con Almacenes). */
    public void cambiarEstado(Long id, boolean activo) {
        int updated = repo.updateEstado(id, activo);
        if (updated == 0) {
            throw new IllegalArgumentException("Sucursal no encontrada: " + id);
        }
    }

    /** Eliminar con manejo amigable de integridad referencial. */
    public void eliminar(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Sucursal no encontrada: " + id);
        }
        try {
            repo.deleteById(id);
        } catch (DataIntegrityViolationException ex) {
            // Si hay FK (p. ej., almacenes que referencian la sucursal), lanzamos mensaje claro
            throw new IllegalStateException("No se puede eliminar la sucursal porque está en uso por otros recursos.", ex);
        }
    }

    /** Opciones para combos, con el mismo criterio de incluirInactivos. */
    public List<OpcionIdNombre> opciones(boolean incluirInactivos) {
        return repo.opciones(incluirInactivos);
    }

    private SucursalRespuestaDTO toDTO(Sucursal e) {
        return SucursalRespuestaDTO.builder()
                .idSucursal(e.getIdSucursal())
                .nombreSucursal(e.getNombreSucursal())
                .direccion(e.getDireccion())
                .ciudad(e.getCiudad())
                .estadoActivo(e.getEstadoActivo())
                .build();
    }
}
