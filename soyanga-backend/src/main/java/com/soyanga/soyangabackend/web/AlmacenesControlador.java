package com.soyanga.soyangabackend.web;

import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.servicio.catalogo.AlmacenServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/almacenes")
@RequiredArgsConstructor
public class AlmacenesControlador {

    private final AlmacenServicio servicio;

    @GetMapping("/opciones")
    public List<OpcionIdNombre> opciones(@RequestParam(defaultValue = "true") boolean activos) {
        return servicio.listarOpciones(activos);
    }
}
