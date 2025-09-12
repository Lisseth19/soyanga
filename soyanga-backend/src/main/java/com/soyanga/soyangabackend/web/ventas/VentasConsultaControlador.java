package com.soyanga.soyangabackend.web.ventas;

import com.soyanga.soyangabackend.dto.ventas.VentaDetalleRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.ventas.VentaRepositorio;
import com.soyanga.soyangabackend.servicio.ventas.VentaConsultaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/ventas")
@RequiredArgsConstructor
public class VentasConsultaControlador {

    private final VentaConsultaServicio servicio;

    @GetMapping
    public Page<VentaRepositorio.VentaListadoProjection> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) LocalDateTime desde,
            @RequestParam(required = false) LocalDateTime hasta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size); // el ORDER BY está en el SQL
        return servicio.listar(estado, clienteId, desde, hasta, pageable);
    }
    @GetMapping("/{id}")
    public VentaDetalleRespuestaDTO detalle(@PathVariable Long id) {
        return servicio.detalle(id);
    }
}
