package com.soyanga.soyangabackend.web.ventas;

import com.soyanga.soyangabackend.dto.ventas.VentaCrearDTO;
import com.soyanga.soyangabackend.dto.ventas.VentaRespuestaDTO;
import com.soyanga.soyangabackend.servicio.ventas.VentaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ventas")
@RequiredArgsConstructor
public class VentaControlador {

    private final VentaServicio servicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VentaRespuestaDTO crear(@Valid @RequestBody VentaCrearDTO dto) {
        return servicio.crear(dto);
    }
}
