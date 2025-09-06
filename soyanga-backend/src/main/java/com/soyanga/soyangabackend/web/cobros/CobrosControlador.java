package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dto.cobros.PagoCrearDTO;
import com.soyanga.soyangabackend.dto.cobros.PagoRespuestaDTO;
import com.soyanga.soyangabackend.servicio.cobros.PagoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cobros/pagos")
@RequiredArgsConstructor
public class CobrosControlador {

    private final PagoServicio servicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PagoRespuestaDTO crear(@Valid @RequestBody PagoCrearDTO dto) {
        return servicio.registrar(dto);
    }
}
