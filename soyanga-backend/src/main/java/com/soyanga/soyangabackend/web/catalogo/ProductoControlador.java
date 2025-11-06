package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.ProductoActualizarDTO;
import com.soyanga.soyangabackend.dto.catalogo.ProductoCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.ProductoDTO;
import com.soyanga.soyangabackend.servicio.catalogo.ProductoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalogo/productos")
@RequiredArgsConstructor
public class ProductoControlador {

    private final ProductoServicio productoServicio;

    @GetMapping
    @PreAuthorize("@perms.tiene(authentication, 'productos:ver')")
    public Page<ProductoDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idCategoria,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nombreProducto,asc") String sort) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort, "nombreProducto"));
        return productoServicio.buscar(q, idCategoria, soloActivos, pageable);
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("@perms.tiene(authentication, 'productos:ver')")
    public ProductoDTO obtener(@PathVariable Long id) {
        return productoServicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'productos:crear')")
    public ProductoDTO crear(@Valid @RequestBody ProductoCrearDTO dto) {
        return productoServicio.crear(dto);
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("@perms.tiene(authentication, 'productos:actualizar')")
    public ProductoDTO actualizar(@PathVariable Long id, @Valid @RequestBody ProductoActualizarDTO dto) {
        return productoServicio.actualizar(id, dto);
    }

    /** Desactivar (soft) */
    @PatchMapping("/{id:\\d+}/desactivar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'productos:actualizar')")
    public void desactivar(@PathVariable Long id) {
        productoServicio.desactivar(id);
    }

    /** Eliminar (hard) solo si no tiene presentaciones */
    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'productos:eliminar')")
    public void eliminar(@PathVariable Long id) {
        productoServicio.eliminar(id);
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
