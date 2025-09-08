package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dto.cobros.PagoAplicarDTO;
import com.soyanga.soyangabackend.dto.cobros.PagoAplicarRespuestaDTO;
import com.soyanga.soyangabackend.dto.cobros.PagoCrearDTO;
import com.soyanga.soyangabackend.dto.cobros.PagoRespuestaDTO;
import com.soyanga.soyangabackend.servicio.cobros.PagoAplicacionServicio;
import com.soyanga.soyangabackend.servicio.cobros.PagoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cobros/pagos")
@RequiredArgsConstructor
public class CobrosControlador {

    private final PagoServicio pagoServicio;
    private final PagoAplicacionServicio aplicacionServicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PagoRespuestaDTO crear(@Valid @RequestBody PagoCrearDTO dto) {
        return pagoServicio.registrar(dto);
    }

    @PostMapping("/{id}/aplicar")
    @ResponseStatus(HttpStatus.CREATED)
    public PagoAplicarRespuestaDTO aplicar(
            @PathVariable Long id,
            @Valid @RequestBody PagoAplicarDTO dto
    ) {
        return aplicacionServicio.aplicar(id, dto);
    }
}
