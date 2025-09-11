package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.MonedaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalogo/monedas")
@RequiredArgsConstructor
public class MonedaControlador {

    private final MonedaServicio servicio;

    @GetMapping
    public Page<MonedaRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("codigoMoneda").ascending());
        return servicio.listar(q, pageable);
    }

    @GetMapping("/{id}")
    public MonedaRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    public MonedaRespuestaDTO crear(@Valid @RequestBody MonedaCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public MonedaRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody MonedaEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
