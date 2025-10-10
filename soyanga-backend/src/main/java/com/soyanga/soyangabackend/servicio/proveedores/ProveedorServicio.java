package com.soyanga.soyangabackend.servicio.proveedores;

import com.soyanga.soyangabackend.dominio.Proveedor;
import com.soyanga.soyangabackend.dto.proveedores.*;
import com.soyanga.soyangabackend.repositorio.compras.ProveedorRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProveedorServicio {

    private final ProveedorRepositorio repo;

    public Page<ProveedorRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        var page = repo.listar((q == null || q.isBlank()) ? null : q.trim(), soloActivos, pageable);
        return page.map(p -> ProveedorRespuestaDTO.builder()
                .idProveedor(p.getIdProveedor())
                .razonSocial(p.getRazonSocial())
                .nit(p.getNit())
                .contacto(p.getContacto())
                .telefono(p.getTelefono())
                .correoElectronico(p.getCorreoElectronico())
                .direccion(p.getDireccion())
                .estadoActivo(p.getEstadoActivo())
                .build());
    }

    public ProveedorRespuestaDTO obtener(Long id) {
        var e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado: " + id));
        return toDTO(e);
    }

    public ProveedorRespuestaDTO crear(ProveedorCrearDTO dto) {
        var e = Proveedor.builder()
                .razonSocial(dto.getRazonSocial())
                .nit(dto.getNit())
                .contacto(dto.getContacto())
                .telefono(dto.getTelefono())
                .correoElectronico(dto.getCorreoElectronico())
                .direccion(dto.getDireccion())
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();
        e = repo.save(e);
        return toDTO(e);
    }

    public ProveedorRespuestaDTO editar(Long id, ProveedorEditarDTO dto) {
        var e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado: " + id));
        e.setRazonSocial(dto.getRazonSocial());
        e.setNit(dto.getNit());
        e.setContacto(dto.getContacto());
        e.setTelefono(dto.getTelefono());
        e.setCorreoElectronico(dto.getCorreoElectronico());
        e.setDireccion(dto.getDireccion());
        if (dto.getEstadoActivo() != null) e.setEstadoActivo(dto.getEstadoActivo());
        e = repo.save(e);
        return toDTO(e);
    }

    public void eliminar(Long id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("Proveedor no encontrado: " + id);
        repo.deleteById(id);
    }

    private ProveedorRespuestaDTO toDTO(Proveedor e) {
        return ProveedorRespuestaDTO.builder()
                .idProveedor(e.getIdProveedor())
                .razonSocial(e.getRazonSocial())
                .nit(e.getNit())
                .contacto(e.getContacto())
                .telefono(e.getTelefono())
                .correoElectronico(e.getCorreoElectronico())
                .direccion(e.getDireccion())
                .estadoActivo(e.getEstadoActivo())
                .build();
    }
}
