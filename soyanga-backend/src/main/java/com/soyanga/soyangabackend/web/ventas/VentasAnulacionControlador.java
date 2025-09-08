package com.soyanga.soyangabackend.web.ventas;

import com.soyanga.soyangabackend.servicio.ventas.AnulacionVentaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ventas")
@RequiredArgsConstructor
public class VentasAnulacionControlador {

    private final AnulacionVentaServicio servicio;

    @PostMapping("/{id}/anular")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> anular(@PathVariable Long id, @RequestParam(required = false) String motivo) {
        return servicio.anularVenta(id, motivo);
    }
}
