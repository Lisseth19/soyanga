package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.UnidadServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalogo/unidades")
@RequiredArgsConstructor
public class UnidadControlador {

    private final UnidadServicio servicio;

    @GetMapping
    public Page<UnidadDTO> listar(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nombreUnidad,asc") String sort) {
        Sort s = parseSort(sort, "nombreUnidad"); // propiedad del entity
        Pageable pageable = PageRequest.of(page, size, s);
        return servicio.buscar(q, pageable);
    }

    @GetMapping("/{id}")
    public UnidadDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UnidadDTO crear(@Valid @RequestBody UnidadCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public UnidadDTO actualizar(@PathVariable Long id, @RequestBody UnidadActualizarDTO dto) {
        return servicio.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    private Sort parseSort(String sort, String fallback) {
        if (sort == null || sort.isBlank())
            return Sort.by(fallback).ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? fallback : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }
}
