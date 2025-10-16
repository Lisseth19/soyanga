package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.PresentacionServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/presentaciones")
@RequiredArgsConstructor
public class PresentacionControlador {

    private final PresentacionServicio presentacionServicio;

    // GET /presentaciones?idProducto=1&q=GLI&page=0&size=20&sort=codigoSku,asc
    @GetMapping
    public Page<PresentacionDTO> listar(
            @RequestParam(required = false) Long idProducto,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "codigoSku,asc") String sort,
            @RequestParam(defaultValue = "true") boolean soloActivos) {

        Sort s = parseSort(sort, "codigoSku");
        Pageable pageable = PageRequest.of(page, size, s);
        Boolean estadoActivo = soloActivos ? Boolean.TRUE : null;
        return presentacionServicio.buscar(idProducto, q, estadoActivo, pageable);
    }

    @GetMapping("/{id}")
    public PresentacionDTO obtener(@PathVariable Long id) {
        return presentacionServicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PresentacionDTO crear(@Valid @RequestBody PresentacionCrearDTO dto) {
        return presentacionServicio.crear(dto);
    }

    @PutMapping("/{id}")
    public PresentacionDTO actualizar(@PathVariable Long id, @RequestBody PresentacionActualizarDTO dto) {
        return presentacionServicio.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desactivar(@PathVariable Long id) {
        presentacionServicio.desactivar(id);
    }

    // --- Códigos de barras por presentación ---

    @GetMapping("/{idPresentacion}/codigos-barras")
    public List<CodigoBarrasDTO> listarCodigos(@PathVariable Long idPresentacion) {
        return presentacionServicio.listarCodigos(idPresentacion);
    }

    @PostMapping("/{idPresentacion}/codigos-barras")
    @ResponseStatus(HttpStatus.CREATED)
    public CodigoBarrasDTO agregarCodigo(@PathVariable Long idPresentacion,
                                         @Valid @RequestBody CodigoBarrasCrearDTO dto) {
        return presentacionServicio.agregarCodigo(idPresentacion, dto);
    }

    @DeleteMapping("/{idPresentacion}/codigos-barras/{idCodigoBarras}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarCodigo(@PathVariable Long idPresentacion,
                               @PathVariable Long idCodigoBarras) {
        presentacionServicio.eliminarCodigo(idPresentacion, idCodigoBarras);
    }

    // ===== IMAGEN =====
    @PostMapping(path = "/{id}/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public PresentacionDTO subirImagen(@PathVariable Long id,
                                       @RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo requerido");
            }
            return presentacionServicio.subirImagen(id, file);
        } catch (IllegalArgumentException e) {
            // por ejemplo: presentación no encontrada
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // típico: columna imagen_url muy corta
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dato inválido al guardar la URL de la imagen", e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo subir la imagen", e);
        }
    }

    @DeleteMapping("/{id}/imagen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarImagen(@PathVariable Long id) {
        presentacionServicio.eliminarImagen(id);
    }

    // util
    private Sort parseSort(String sort, String fallback) {
        if (sort == null || sort.isBlank())
            return Sort.by(fallback).ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? fallback : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }
}
