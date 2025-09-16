package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.ProductoActualizarDTO;
import com.soyanga.soyangabackend.dto.catalogo.ProductoCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.ProductoDTO;
import com.soyanga.soyangabackend.servicio.catalogo.ProductoServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalogo/productos")
@RequiredArgsConstructor
public class ProductoControlador {

    private final ProductoServicio productoServicio;

    // GET
    // /api/v1/catalogo/productos?q=...&idCategoria=...&soloActivos=...&page=0&size=20&sort=nombreProducto,asc
    @GetMapping
    public Page<ProductoDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idCategoria, // CAMBIO: nuevo filtro
            @RequestParam(defaultValue = "false") boolean soloActivos, // CAMBIO: nuevo filtro
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nombreProducto,asc") String sort) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        return productoServicio.buscar(q, idCategoria, soloActivos, pageable); // CAMBIO
    }

    @GetMapping("/{id}")
    public ProductoDTO obtener(@PathVariable Long id) {
        return productoServicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductoDTO crear(@RequestBody ProductoCrearDTO dto) {
        return productoServicio.crear(dto);
    }

    @PutMapping("/{id}")
    public ProductoDTO actualizar(@PathVariable Long id, @RequestBody ProductoActualizarDTO dto) {
        return productoServicio.actualizar(id, dto);
    }

    // “Eliminar” = desactivar
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desactivar(@PathVariable Long id) {
        productoServicio.desactivar(id);
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank())
            return Sort.by("nombreProducto").ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? "nombreProducto" : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }
}
