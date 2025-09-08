package com.soyanga.soyangabackend.web.ventas;

import com.soyanga.soyangabackend.dto.ventas.VentaTrazabilidadDTO;
import com.soyanga.soyangabackend.servicio.ventas.VentaTrazabilidadServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ventas")
@RequiredArgsConstructor
public class VentasTrazabilidadControlador {

    private final VentaTrazabilidadServicio servicio;

    @GetMapping("/{id}/trazabilidad")
    public VentaTrazabilidadDTO trazabilidad(@PathVariable("id") Long idVenta) {
        return servicio.obtener(idVenta);
    }
}
