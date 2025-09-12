package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Sucursal;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.dto.sucursales.*;
import com.soyanga.soyangabackend.repositorio.catalogo.SucursalRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SucursalServicio {

    private final SucursalRepositorio repo;

    public Page<SucursalRespuestaDTO> listar(String q, String ciudad, boolean soloActivos, Pageable pageable) {
        var page = repo.listar(
                (q == null || q.isBlank()) ? null : q.trim(),
                (ciudad == null || ciudad.isBlank()) ? null : ciudad.trim(),
                soloActivos,
                pageable);
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
        if (dto.getEstadoActivo() != null)
            e.setEstadoActivo(dto.getEstadoActivo());
        e = repo.save(e);
        return toDTO(e);
    }

    public void eliminar(Long id) {
        if (!repo.existsById(id))
            throw new IllegalArgumentException("Sucursal no encontrada: " + id);
        repo.deleteById(id);
    }

    public List<OpcionIdNombre> opciones(boolean soloActivos) {
        return repo.opciones(soloActivos);
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
