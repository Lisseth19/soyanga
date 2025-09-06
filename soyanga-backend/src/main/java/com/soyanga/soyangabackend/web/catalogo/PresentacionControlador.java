package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.PresentacionServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(defaultValue = "codigoSku,asc") String sort
    ) {
        Sort s = parseSort(sort, "codigoSku");
        Pageable pageable = PageRequest.of(page, size, s);
        return presentacionServicio.buscar(idProducto, q, pageable);
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

    // util
    private Sort parseSort(String sort, String fallback) {
        if (sort == null || sort.isBlank()) return Sort.by(fallback).ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? fallback : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }
}
