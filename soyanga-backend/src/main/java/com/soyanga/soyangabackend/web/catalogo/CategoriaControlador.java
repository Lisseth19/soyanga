package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.CategoriaActualizarDTO;
import com.soyanga.soyangabackend.dto.catalogo.CategoriaCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.CategoriaDTO;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.servicio.catalogo.CategoriaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CRUD de Categorías
 * Permisos:
 * - categorias:ver
 * - categorias:crear
 * - categorias:actualizar
 * - categorias:eliminar
 */
@RestController
@RequestMapping("/api/v1/catalogo/categorias")
@RequiredArgsConstructor
public class CategoriaControlador {

    private final CategoriaServicio servicio;

    /** Listado con filtros y orden dinámico */
    @GetMapping
    @PreAuthorize("@perms.tiene(authentication, 'categorias:ver')")
    public Page<CategoriaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idCategoriaPadre,
            @RequestParam(defaultValue = "false") boolean soloRaices,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nombreCategoria,asc") String sort
    ) {
        Sort s = parseSort(sort, "nombreCategoria");
        Pageable pageable = PageRequest.of(page, size, s);
        return servicio.buscar(q, idCategoriaPadre, soloRaices, pageable);
    }

    /** Opciones de combo (antes de /{id} para evitar conflictos) */
    @GetMapping("/opciones")
    @PreAuthorize("@perms.tiene(authentication, 'categorias:ver')")
    public List<OpcionIdNombre> opciones(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idCategoriaPadre
    ) {
        return servicio.opciones(q, idCategoriaPadre);
    }

    /** Obtener por id (regex para no capturar /opciones) */
    @GetMapping("/{id:\\d+}")
    @PreAuthorize("@perms.tiene(authentication, 'categorias:ver')")
    public CategoriaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    /** Crear */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'categorias:crear')")
    public CategoriaDTO crear(@Valid @RequestBody CategoriaCrearDTO dto) {
        return servicio.crear(dto);
    }

    /** Actualizar */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("@perms.tiene(authentication, 'categorias:actualizar')")
    public CategoriaDTO actualizar(@PathVariable Long id, @Valid @RequestBody CategoriaActualizarDTO dto) {
        return servicio.actualizar(id, dto);
    }

    /** Eliminar (suele ser soft delete en servicio si hay FK) */
    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'categorias:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
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
