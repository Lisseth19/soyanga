package com.soyanga.soyangabackend.servicio.proveedores;

import com.soyanga.soyangabackend.dominio.Proveedor;
import com.soyanga.soyangabackend.dto.proveedores.*;
import com.soyanga.soyangabackend.repositorio.compras.ProveedorRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProveedorServicio {

    private final ProveedorRepositorio repo;

    /* ===== LECTURA ===== */
    @Transactional(readOnly = true)
    public Page<ProveedorRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        var page = repo.listar((q == null || q.isBlank()) ? null : q.trim(), soloActivos, pageable);
        // page es Page<ProveedorListadoProjection>
        return page.map(this::toDTO); // usa el mapper de PROYECCIÓN
    }

    @Transactional(readOnly = true)
    public ProveedorRespuestaDTO obtener(Long id) {
        var e = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado: " + id));
        return toDTO(e); // usa el mapper de ENTIDAD
    }

    /* ===== CREAR ===== */
    @Transactional
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

    /* ===== ACTUALIZAR ===== */
    @Transactional
    public ProveedorRespuestaDTO editar(Long id, ProveedorEditarDTO dto) {
        var e = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado: " + id));

        e.setRazonSocial(dto.getRazonSocial());
        e.setNit(dto.getNit());
        e.setContacto(dto.getContacto());
        e.setTelefono(dto.getTelefono());
        e.setCorreoElectronico(dto.getCorreoElectronico());
        e.setDireccion(dto.getDireccion());
        if (dto.getEstadoActivo() != null) {
            e.setEstadoActivo(dto.getEstadoActivo());
        }

        e = repo.save(e);
        return toDTO(e);
    }

    /* ===== ACTIVAR / DESACTIVAR ===== */
    @Transactional
    public ProveedorRespuestaDTO cambiarEstado(Long id, ProveedorEstadoDTO dto) {
        var e = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado: " + id));

        if (dto.getActivo() == null) {
            return toDTO(e);
        }

        e.setEstadoActivo(dto.getActivo());
        e = repo.save(e);
        return toDTO(e);
    }

    /* ===== ELIMINAR ===== */
    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Proveedor no encontrado: " + id);
        }
        repo.deleteById(id);
    }

    /* ===== MAPPERS ===== */

    // Mapper para ENTIDAD
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

    // Mapper para PROYECCIÓN de listar (ajusta el import si tu interfaz está en otro paquete)
    private ProveedorRespuestaDTO toDTO(ProveedorListadoProjection p) {
        return ProveedorRespuestaDTO.builder()
                .idProveedor(p.getIdProveedor())
                .razonSocial(p.getRazonSocial())
                .nit(p.getNit())
                .contacto(p.getContacto())
                .telefono(p.getTelefono())
                .correoElectronico(p.getCorreoElectronico())
                .direccion(p.getDireccion())
                .estadoActivo(p.getEstadoActivo())
                .build();
    }
}
