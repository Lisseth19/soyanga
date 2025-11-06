package com.soyanga.soyangabackend.servicio.clientes;

import com.soyanga.soyangabackend.dominio.Cliente;
import com.soyanga.soyangabackend.dto.clientes.ClienteCrearDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteEditarDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.clientes.ClienteRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClienteServicio {

    private final ClienteRepositorio repo;

    /* ==================== Mappers & helpers ==================== */

    private ClienteRespuestaDTO toDTO(Cliente c) {
        return ClienteRespuestaDTO.builder()
                .idCliente(c.getIdCliente())
                .razonSocialONombre(c.getRazonSocialONombre())
                .nit(c.getNit())
                .telefono(c.getTelefono())
                .correoElectronico(c.getCorreoElectronico())
                .direccion(c.getDireccion())
                .ciudad(c.getCiudad())
                .condicionDePago(c.getCondicionDePago() != null ? c.getCondicionDePago().name() : null)
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

    /* ==================== Consultas ==================== */

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

    /* ==================== Comandos ==================== */

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
                .estadoActivo(true) // nuevo cliente activo por defecto
                .build();

        c = repo.save(c);
        return toDTO(c);
    }

    @Transactional
    public ClienteRespuestaDTO editar(Long id, ClienteEditarDTO dto) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + id));

        // Unicidad de NIT
        if (dto.getNit() != null && !dto.getNit().isBlank()) {
            var nitNuevo = dto.getNit().trim();
            var nitActual = c.getNit() == null ? "" : c.getNit();
            if (!nitNuevo.equalsIgnoreCase(nitActual) && repo.existsByNitIgnoreCase(nitNuevo)) {
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

    /**
     * ELIMINACIÓN REAL (hard delete).
     * Si el cliente está referenciado, relanzamos DataIntegrityViolationException
     * con un mensaje claro. El handler global la convertirá en 409 CONFLICT.
     */
    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Cliente no encontrado: " + id);
        }
        try {
            repo.deleteById(id);
            // Forzar la comprobación de FKs ahora mismo
            repo.flush();
        } catch (DataIntegrityViolationException ex) {
            // Misma clase, mensaje claro para el handler
            throw new DataIntegrityViolationException(
                    "No se puede eliminar el cliente porque está en uso en otros registros.",
                    ex
            );
        }
    }

    /**
     * PATCH /api/v1/clientes/{id}/estado (activar / desactivar).
     */
    @Transactional
    public ClienteRespuestaDTO cambiarEstado(Long id, boolean activo) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + id));
        c.setEstadoActivo(activo);
        c = repo.save(c);
        return toDTO(c);
    }
}
