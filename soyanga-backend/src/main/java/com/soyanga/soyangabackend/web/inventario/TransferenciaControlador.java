package com.soyanga.soyangabackend.web.inventario;

import com.soyanga.soyangabackend.dto.inventario.TransferenciaCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaRespuestaDTO;
import com.soyanga.soyangabackend.servicio.inventario.TransferenciaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventario/transferencias")
@RequiredArgsConstructor
public class TransferenciaControlador {

    private final TransferenciaServicio servicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransferenciaRespuestaDTO crear(@Valid @RequestBody TransferenciaCrearDTO dto) {
        return servicio.transferirYCompletar(dto);
    }
}
