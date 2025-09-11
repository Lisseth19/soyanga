package com.soyanga.soyangabackend.servicio.clientes;

import com.soyanga.soyangabackend.dominio.Cliente;
import com.soyanga.soyangabackend.dto.clientes.ClienteCrearDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteEditarDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.clientes.ClienteRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClienteServicio {

    private final ClienteRepositorio repo;

    private ClienteRespuestaDTO toDTO(Cliente c) {
        return ClienteRespuestaDTO.builder()
                .idCliente(c.getIdCliente())
                .razonSocialONombre(c.getRazonSocialONombre())
                .nit(c.getNit())
                .telefono(c.getTelefono())
                .correoElectronico(c.getCorreoElectronico())
                .direccion(c.getDireccion())
                .ciudad(c.getCiudad())
                .condicionDePago(
                        c.getCondicionDePago() != null ? c.getCondicionDePago().name() : null
                )
                .limiteCreditoBob(c.getLimiteCreditoBob())
                .estadoActivo(Boolean.TRUE.equals(c.getEstadoActivo()))
                .build();
    }

    private Cliente.CondicionPago parseCondicion(String s) {
        if (s == null) return Cliente.CondicionPago.contado;
        switch (s.toLowerCase()) {
            case "contado": return Cliente.CondicionPago.contado;
            case "credito": return Cliente.CondicionPago.credito;
            default: throw new IllegalArgumentException("condicionDePago inválida: " + s);
        }
    }

    @Transactional(readOnly = true)
    public Page<ClienteRespuestaDTO> listar(String q, Boolean soloActivos, Pageable pageable) {
        var page = repo.buscar(
                (q == null || q.isBlank()) ? null : q.trim(),
                Boolean.TRUE.equals(soloActivos),
                pageable
        );
        return page.map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public ClienteRespuestaDTO obtener(Long id) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + id));
        return toDTO(c);
    }

    @Transactional
    public ClienteRespuestaDTO crear(ClienteCrearDTO dto) {
        if (dto.getNit() != null && !dto.getNit().isBlank()
                && repo.existsByNitIgnoreCase(dto.getNit().trim())) {
            throw new IllegalArgumentException("Ya existe un cliente con ese NIT");
        }

        var c = Cliente.builder()
                .razonSocialONombre(dto.getRazonSocialONombre().trim())
                .nit(dto.getNit() != null ? dto.getNit().trim() : null)
                .telefono(dto.getTelefono())
                .correoElectronico(dto.getCorreoElectronico())
                .direccion(dto.getDireccion())
                .ciudad(dto.getCiudad())
                .condicionDePago(parseCondicion(dto.getCondicionDePago()))
                .limiteCreditoBob(dto.getLimiteCreditoBob())
                .estadoActivo(true)
                .build();
        c = repo.save(c);
        return toDTO(c);
    }

    @Transactional
    public ClienteRespuestaDTO editar(Long id, ClienteEditarDTO dto) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + id));

        if (dto.getNit() != null && !dto.getNit().isBlank()) {
            var nitNuevo = dto.getNit().trim();
            // si cambió y ya existe en otro
            if (!nitNuevo.equalsIgnoreCase(c.getNit() != null ? c.getNit() : "")
                    && repo.existsByNitIgnoreCase(nitNuevo)) {
                throw new IllegalArgumentException("Ya existe un cliente con ese NIT");
            }
            c.setNit(nitNuevo);
        } else {
            c.setNit(null);
        }

        c.setRazonSocialONombre(dto.getRazonSocialONombre().trim());
        c.setTelefono(dto.getTelefono());
        c.setCorreoElectronico(dto.getCorreoElectronico());
        c.setDireccion(dto.getDireccion());
        c.setCiudad(dto.getCiudad());
        if (dto.getCondicionDePago() != null) {
            c.setCondicionDePago(parseCondicion(dto.getCondicionDePago()));
        }
        c.setLimiteCreditoBob(dto.getLimiteCreditoBob());
        if (dto.getEstadoActivo() != null) {
            c.setEstadoActivo(dto.getEstadoActivo());
        }

        c = repo.save(c);
        return toDTO(c);
    }

    @Transactional
    public void eliminar(Long id) {
        // Regla simple: soft delete (estado_activo = false) para no romper FK
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + id));
        c.setEstadoActivo(false);
        repo.save(c);
    }
}
