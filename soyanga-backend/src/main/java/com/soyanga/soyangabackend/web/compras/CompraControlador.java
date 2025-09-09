package com.soyanga.soyangabackend.web.compras;

import com.soyanga.soyangabackend.dto.compras.*;
import com.soyanga.soyangabackend.servicio.compras.CompraServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/compras")
@RequiredArgsConstructor
public class CompraControlador {

    private final CompraServicio servicio;

    @GetMapping
    public Page<CompraListadoProjection> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Long proveedorId,
            @RequestParam(required = false) LocalDateTime desde,
            @RequestParam(required = false) LocalDateTime hasta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size); // el ORDER BY está en el SQL
        return servicio.listar(estado, proveedorId, desde, hasta, pageable);
    }

    @GetMapping("/{id}")
    public CompraRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    public CompraRespuestaDTO crear(@Valid @RequestBody CompraCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PostMapping("/{id}/items")
    public CompraDetalleRespuestaDTO agregarItem(@PathVariable Long id,
                                                 @Valid @RequestBody CompraDetalleCrearDTO dto) {
        return servicio.agregarItem(id, dto);
    }

    @PostMapping("/{id}/estado")
    public CompraRespuestaDTO cambiarEstado(@PathVariable Long id,
                                            @RequestParam String nuevo) {
        return servicio.cambiarEstado(id, nuevo);
    }
}
