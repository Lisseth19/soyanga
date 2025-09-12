package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.dto.sucursales.*;
import com.soyanga.soyangabackend.servicio.catalogo.SucursalServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/sucursales")
@RequiredArgsConstructor
public class SucursalControlador {

    private final SucursalServicio servicio;

    @GetMapping
    public Page<SucursalRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String ciudad,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, ciudad, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public SucursalRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SucursalRespuestaDTO crear(@Valid @RequestBody SucursalCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public SucursalRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody SucursalEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    // Para combos en frontend
    @GetMapping("/opciones")
    public List<OpcionIdNombre> opciones(@RequestParam(defaultValue = "true") boolean soloActivos) {
        return servicio.opciones(soloActivos);
    }
}
