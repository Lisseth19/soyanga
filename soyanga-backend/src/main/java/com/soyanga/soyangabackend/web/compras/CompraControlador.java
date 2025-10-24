package com.soyanga.soyangabackend.web.compras;

import com.soyanga.soyangabackend.dto.compras.*;
import com.soyanga.soyangabackend.servicio.compras.CompraServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;

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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size);
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

    @PutMapping("/{id}/items/{detalleId}")
    public CompraDetalleRespuestaDTO actualizarItem(@PathVariable Long id,
            @PathVariable Long detalleId,
            @RequestBody CompraDetalleActualizarDTO dto) {
        return servicio.actualizarItem(id, detalleId, dto);
    }

    @DeleteMapping("/{id}/items/{detalleId}")
    public void eliminarItem(@PathVariable Long id, @PathVariable Long detalleId) {
        servicio.eliminarItem(id, detalleId);
    }

    @PostMapping("/{id}/estado")
    public CompraRespuestaDTO cambiarEstado(@PathVariable Long id,
            @RequestParam String nuevo) {
        return servicio.cambiarEstado(id, nuevo);
    }

    @PostMapping("/{id}/aprobar")
    public CompraRespuestaDTO aprobar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, "aprobada");
    }

    @PostMapping("/{id}/anular")
    public CompraRespuestaDTO anular(@PathVariable Long id, @RequestParam(required = false) String motivo) {
        // si quieres dejar constancia, apéndalo en observaciones dentro del servicio
        return servicio.cambiarEstado(id, "anulada");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminarSiVacia(id); // o servicio.eliminar(id) si no quieres validar
    }

}
