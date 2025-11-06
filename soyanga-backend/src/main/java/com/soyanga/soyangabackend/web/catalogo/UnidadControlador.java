package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.UnidadServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/unidades")
@RequiredArgsConstructor
public class UnidadControlador {

    private final UnidadServicio servicio;

    /* ===== Listar (ver) ===== */
    @GetMapping
    @PreAuthorize("@perms.tiene(authentication, 'unidades:ver')")
    public Page<UnidadDTO> listar(@RequestParam(required = false) String q,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(defaultValue = "nombreUnidad,asc") String sort) {
        Sort s = parseSort(sort, "nombreUnidad");
        Pageable pageable = PageRequest.of(page, size, s);
        return servicio.buscar(q, pageable);
    }

    /* ===== Obtener (ver) ===== */
    @GetMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'unidades:ver')")
    public UnidadDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    /* ===== Crear (crear) ===== */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'unidades:crear')")
    public UnidadDTO crear(@Valid @RequestBody UnidadCrearDTO dto) {
        return servicio.crear(dto);
    }

    /* ===== Actualizar (actualizar) ===== */
    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'unidades:actualizar')")
    public UnidadDTO actualizar(@PathVariable Long id, @RequestBody UnidadActualizarDTO dto) {
        return servicio.actualizar(id, dto);
    }

    /* ===== Eliminar (eliminar) ===== */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'unidades:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    /* ===== Opciones para combos (ver) =====
       Devuelve [{ id, nombre }] usando nombreUnidad (y opcionalmente abreviatura) */
    @GetMapping("/opciones")
    @PreAuthorize("@perms.tiene(authentication, 'unidades:ver')")
    public List<Opcion> opciones(@RequestParam(required = false) String q,
                                 @RequestParam(defaultValue = "1000") int size) {
        Page<UnidadDTO> page = servicio.buscar(q, PageRequest.of(
                0, Math.max(1, size),
                Sort.by("nombreUnidad").ascending()
        ));
        return page.map(u -> new Opcion(u.getIdUnidad(), u.getNombreUnidad())).getContent();
        // Para incluir abreviatura en el texto:
        // return page.map(u -> new Opcion(u.getIdUnidad(),
        //     u.getAbreviatura() == null ? u.getNombreUnidad()
        //       : u.getNombreUnidad() + " (" + u.getAbreviatura() + ")")).getContent();
    }

    /* ===== Util ===== */
    private Sort parseSort(String sort, String fallback) {
        if (sort == null || sort.isBlank())
            return Sort.by(fallback).ascending();
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim().isEmpty() ? fallback : parts[0].trim();
        boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        return desc ? Sort.by(field).descending() : Sort.by(field).ascending();
    }

    /* DTO simple para /opciones */
    public static class Opcion {
        private final Long id;
        private final String nombre;
        public Opcion(Long id, String nombre) { this.id = id; this.nombre = nombre; }
        public Long getId() { return id; }
        public String getNombre() { return nombre; }
    }
}
