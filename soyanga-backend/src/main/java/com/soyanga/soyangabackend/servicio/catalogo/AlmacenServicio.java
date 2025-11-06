package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Almacen;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenEditarDTO;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenListadoProjection;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenRespuestaDTO;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.repositorio.catalogo.AlmacenRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional // por defecto writable; queries abajo serán readOnly
public class AlmacenServicio {

    private final AlmacenRepositorio repo;

    /* ====================== QUERIES ====================== */

    @Transactional(readOnly = true)
    public Page<AlmacenListadoProjection> listar(String q, Long idSucursal, boolean incluirInactivos, Pageable pageable) {
        String filtro = (q == null || q.isBlank()) ? null : q.trim();
        return repo.listar(filtro, idSucursal, incluirInactivos, pageable);
    }

    @Transactional(readOnly = true)
    public AlmacenRespuestaDTO obtener(Long id) {
        var a = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Almacén no encontrado: " + id));
        return toDTO(a);
    }

    @Transactional(readOnly = true)
    public List<OpcionIdNombre> opciones(boolean incluirInactivos, Long idSucursal) {
        if (idSucursal != null) {
            return repo.findByIdSucursalAndEstadoActivoTrue(idSucursal).stream()
                    .map(a -> OpcionIdNombre.builder()
                            .id(a.getIdAlmacen())
                            .nombre(a.getNombreAlmacen())
                            .build())
                    .toList();
        }
        return repo.opciones(incluirInactivos);
    }

    /* ====================== COMANDOS ====================== */

    public AlmacenRespuestaDTO crear(AlmacenCrearDTO dto) {
        // Validaciones básicas
        if (dto.getIdSucursal() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La sucursal es obligatoria.");
        }
        if (dto.getNombreAlmacen() == null || dto.getNombreAlmacen().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del almacén es obligatorio.");
        }

        // Duplicado (por sucursal + nombre, case-insensitive)
        boolean dup = repo.existsByIdSucursalAndNombreAlmacenIgnoreCase(dto.getIdSucursal(), dto.getNombreAlmacen().trim());
        if (dup) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ya existe un almacén con ese nombre en la sucursal.");
        }

        var a = Almacen.builder()
                .idSucursal(dto.getIdSucursal())
                .nombreAlmacen(dto.getNombreAlmacen().trim())
                .descripcion(dto.getDescripcion())
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();
        a = repo.save(a);
        return toDTO(a);
    }

    public AlmacenRespuestaDTO editar(Long id, AlmacenEditarDTO dto) {
        var a = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Almacén no encontrado: " + id));

        if (dto.getIdSucursal() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La sucursal es obligatoria.");
        }
        if (dto.getNombreAlmacen() == null || dto.getNombreAlmacen().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del almacén es obligatorio.");
        }

        boolean dup = repo.existsByIdSucursalAndNombreAlmacenIgnoreCaseAndIdAlmacenNot(
                dto.getIdSucursal(), dto.getNombreAlmacen().trim(), id);
        if (dup) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ya existe un almacén con ese nombre en la sucursal.");
        }

        a.setIdSucursal(dto.getIdSucursal());
        a.setNombreAlmacen(dto.getNombreAlmacen().trim());
        a.setDescripcion(dto.getDescripcion());
        a.setEstadoActivo(dto.getEstadoActivo());

        repo.save(a);
        return toDTO(a);
    }

    public void eliminar(Long id) {
        // NOT FOUND temprano
        var a = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Almacén no encontrado: " + id));

        try {
            repo.deleteById(a.getIdAlmacen());
        } catch (DataIntegrityViolationException dive) {
            // Referenciado por movimientos/inventarios/documentos → 409
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se puede eliminar: el almacén está en uso.");
        }
    }

    public void cambiarEstado(Long id, boolean activo) {
        int updated = repo.updateEstado(id, activo);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Almacén no encontrado: " + id);
        }
        // Reglas de negocio especiales aquí (si las necesitas):
        // - impedir desactivar si es “almacén por defecto” y no hay reemplazo, etc.
    }

    /* ====================== HELPERS ====================== */

    private AlmacenRespuestaDTO toDTO(Almacen a) {
        return AlmacenRespuestaDTO.builder()
                .idAlmacen(a.getIdAlmacen())
                .idSucursal(a.getIdSucursal())
                .sucursal(null) // si luego quieres el nombre, añadimos proyección con JOIN
                .nombreAlmacen(a.getNombreAlmacen())
                .descripcion(a.getDescripcion())
                .estadoActivo(a.getEstadoActivo())
                .build();
    }
}
