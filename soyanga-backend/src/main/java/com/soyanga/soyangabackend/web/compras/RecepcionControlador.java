package com.soyanga.soyangabackend.web.compras;

import com.soyanga.soyangabackend.dto.compras.RecepcionCrearDTO;
import com.soyanga.soyangabackend.dto.compras.RecepcionRespuestaDTO;
import com.soyanga.soyangabackend.servicio.compras.RecepcionServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/compras/recepciones")
@RequiredArgsConstructor
public class RecepcionControlador {

    private final RecepcionServicio servicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecepcionRespuestaDTO crear(@Valid @RequestBody RecepcionCrearDTO dto) {
        return servicio.registrar(dto);
    }
    @PatchMapping("/{id}/cerrar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cerrar(@PathVariable Long id) {
        servicio.cerrar(id);
    }

}
