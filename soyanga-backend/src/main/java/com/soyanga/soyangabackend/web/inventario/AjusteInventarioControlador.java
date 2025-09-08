package com.soyanga.soyangabackend.web.inventario;

import com.soyanga.soyangabackend.dto.inventario.AjusteCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.AjusteRespuestaDTO;
import com.soyanga.soyangabackend.servicio.inventario.AjusteInventarioServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventario/ajustes")
@RequiredArgsConstructor
public class AjusteInventarioControlador {

    private final AjusteInventarioServicio servicio;

    @PostMapping("/ingreso")
    @ResponseStatus(HttpStatus.CREATED)
    public AjusteRespuestaDTO ajustarIngreso(@Valid @RequestBody AjusteCrearDTO dto) {
        return servicio.ingreso(dto);
    }

    @PostMapping("/salida")
    @ResponseStatus(HttpStatus.CREATED)
    public AjusteRespuestaDTO ajustarSalida(@Valid @RequestBody AjusteCrearDTO dto) {
        return servicio.salida(dto);
    }
}
