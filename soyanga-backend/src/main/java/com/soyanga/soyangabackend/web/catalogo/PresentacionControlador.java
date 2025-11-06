package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.PresentacionServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * CRUD de Presentaciones de Producto
 * Permisos:
 * - presentaciones:ver
 * - presentaciones:crear
 * - presentaciones:actualizar
 * - presentaciones:eliminar
 */
@RestController
@RequestMapping("/api/v1/catalogo/presentaciones")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'presentaciones:ver')") // Todos los GET requieren ver
public class PresentacionControlador {

    private final PresentacionServicio presentacionServicio;

    /** Listado con filtros y orden dinámico */
    // GET /presentaciones?idProducto=1&q=GLI&page=0&size=20&sort=codigoSku,asc&soloActivos=true
    @GetMapping
    public Page<PresentacionDTO> listar(
            @RequestParam(required = false) Long idProducto,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "codigoSku,asc") String sort,
            @RequestParam(defaultValue = "true") boolean soloActivos
    ) {
        Sort s = parseSort(sort, "codigoSku");
        Pageable pageable = PageRequest.of(page, size, s);
        Boolean estadoActivo = soloActivos ? Boolean.TRUE : null;
        return presentacionServicio.buscar(idProducto, q, estadoActivo, pageable);
    }

    /** Obtener por id (regex para no capturar subrutas) */
    @GetMapping("/{id:\\d+}")
    public PresentacionDTO obtener(@PathVariable Long id) {
        return presentacionServicio.obtener(id);
    }

    /** Crear */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:crear')")
    public PresentacionDTO crear(@Valid @RequestBody PresentacionCrearDTO dto) {
        return presentacionServicio.crear(dto);
    }

    /** Actualizar */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:actualizar')")
    public PresentacionDTO actualizar(@PathVariable Long id, @RequestBody PresentacionActualizarDTO dto) {
        return presentacionServicio.actualizar(id, dto);
    }

    /** “Eliminar” = desactivar */
    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:actualizar')")
    public void desactivar(@PathVariable Long id) {
        presentacionServicio.desactivar(id);
    }

    // ===== Códigos de barras por presentación =====

    /** Listar códigos (GET → ver) */
    @GetMapping("/{idPresentacion:\\d+}/codigos-barras")
    public List<CodigoBarrasDTO> listarCodigos(@PathVariable Long idPresentacion) {
        return presentacionServicio.listarCodigos(idPresentacion);
    }

    /** Agregar código (modifica → actualizar) */
    @PostMapping("/{idPresentacion:\\d+}/codigos-barras")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:actualizar')")
    public CodigoBarrasDTO agregarCodigo(@PathVariable Long idPresentacion,
                                         @Valid @RequestBody CodigoBarrasCrearDTO dto) {
        return presentacionServicio.agregarCodigo(idPresentacion, dto);
    }

    /** Eliminar código (modifica → actualizar) */
    @DeleteMapping("/{idPresentacion:\\d+}/codigos-barras/{idCodigoBarras:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:eliminar')")
    public void eliminarCodigo(@PathVariable Long idPresentacion,
                               @PathVariable Long idCodigoBarras) {
        presentacionServicio.eliminarCodigo(idPresentacion, idCodigoBarras);
    }

    // ===== Imagen =====

    /** Subir/actualizar imagen (modifica → actualizar) */
    @PostMapping(path = "/{id:\\d+}/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:actualizar')")
    public PresentacionDTO subirImagen(@PathVariable Long id,
                                       @RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo requerido");
            }
            return presentacionServicio.subirImagen(id, file);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dato inválido al guardar la URL de la imagen", e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo subir la imagen", e);
        }
    }

    /** Eliminar imagen (modifica → actualizar) */
    @DeleteMapping("/{id:\\d+}/imagen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'presentaciones:actualizar')")
    public void eliminarImagen(@PathVariable Long id) {
        presentacionServicio.eliminarImagen(id);
    }

    // ===== Utils =====
    private Sort parseSort(String sort, String fallback) {
        if (sort == null || sort.isBlank()) return Sort.by(fallback).ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? fallback : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }
}
