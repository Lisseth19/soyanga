package com.soyanga.soyangabackend.web.ventas;

import com.soyanga.soyangabackend.servicio.ventas.DespachoVentaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ventas")
@RequiredArgsConstructor
public class VentasDespachoControlador {

    private final DespachoVentaServicio servicio;

    @PostMapping("/{id}/despachar")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> despachar(@PathVariable("id") Long idVenta) {
        return servicio.despachar(idVenta);
    }
}
