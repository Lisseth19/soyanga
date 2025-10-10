package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.servicio.catalogo.CategoriaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/categorias")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'categorias:ver')") // Todos los GET requieren categorias:ver
public class CategoriaControlador {

    private final CategoriaServicio servicio;

    // LISTAR (filtros: q, idCategoriaPadre, soloRaices)
    @GetMapping
    public Page<CategoriaDTO> listar(@RequestParam(required = false) String q,
                                     @RequestParam(required = false) Long idCategoriaPadre,
                                     @RequestParam(defaultValue = "false") boolean soloRaices,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size,
                                     @RequestParam(defaultValue = "nombreCategoria,asc") String sort) {
        Sort s = parseSort(sort, "nombreCategoria");
        Pageable pageable = PageRequest.of(page, size, s);
        return servicio.buscar(q, idCategoriaPadre, soloRaices, pageable);
    }

    // Opciones para combos (antes de /{id})
    @GetMapping("/opciones")
    public List<OpcionIdNombre> opciones(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) Long idCategoriaPadre) {
        return servicio.opciones(q, idCategoriaPadre);
    }

    // Obtener por id (restringe a dígitos para no capturar "/opciones")
    @GetMapping("/{id:\\d+}")
    public CategoriaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    // Crear
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'categorias:crear')")
    public CategoriaDTO crear(@Valid @RequestBody CategoriaCrearDTO dto) {
        return servicio.crear(dto);
    }

    // Actualizar
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("@perms.tiene(authentication, 'categorias:actualizar')")
    public CategoriaDTO actualizar(@PathVariable Long id, @RequestBody CategoriaActualizarDTO dto) {
        return servicio.actualizar(id, dto);
    }

    // Eliminar
    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'categorias:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    private Sort parseSort(String sort, String fallback) {
        if (sort == null || sort.isBlank()) return Sort.by(fallback).ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? fallback : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }
}
