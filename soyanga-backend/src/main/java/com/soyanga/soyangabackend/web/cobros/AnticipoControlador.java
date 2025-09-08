package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dto.cobros.*;
import com.soyanga.soyangabackend.servicio.cobros.ReservaAnticipoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/anticipos")
@RequiredArgsConstructor
public class AnticipoControlador {

    private final ReservaAnticipoServicio reservaServicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> crear(@Valid @RequestBody AnticipoCrearDTO dto) {
        return reservaServicio.crearAnticipo(dto);
    }

    @PostMapping("/{id}/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservaAnticipoRespuestaDTO reservar(@PathVariable("id") Long idAnticipo,
                                                @Valid @RequestBody ReservaAnticipoDTO dto) {
        return reservaServicio.reservar(idAnticipo, dto);
    }

    @PostMapping("/{id}/reservas/liberar")
    @ResponseStatus(HttpStatus.OK)
    public ReservaAnticipoRespuestaDTO liberar(@PathVariable("id") Long idAnticipo,
                                               @Valid @RequestBody LiberarReservaAnticipoDTO dto) {
        return reservaServicio.liberar(idAnticipo, dto);
    }

    @PostMapping("/{id}/reservas/liberar-todo")
    @ResponseStatus(HttpStatus.OK)
    public Map<String,Object> liberarTodo(@PathVariable("id") Long idAnticipo) {
        return reservaServicio.liberarTodo(idAnticipo);
    }
}
