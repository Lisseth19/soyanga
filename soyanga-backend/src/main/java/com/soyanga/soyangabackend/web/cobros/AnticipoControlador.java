package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.dto.cobros.*;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.servicio.cobros.AnticipoAplicacionServicio;
import com.soyanga.soyangabackend.servicio.cobros.AnticipoConsultaServicio;
import com.soyanga.soyangabackend.servicio.cobros.ReservaAnticipoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/anticipos")
@RequiredArgsConstructor
public class AnticipoControlador {

    private final ReservaAnticipoServicio reservaServicio;
    private final AnticipoConsultaServicio consultaServicio;
    private final AnticipoAplicacionServicio aplicacionServicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> crear(@Valid @RequestBody AnticipoCrearDTO dto) {
        return reservaServicio.crearAnticipo(dto);
    }

    // === LISTAR (idCliente opcional) ===
    @GetMapping
    public Page<AnticipoRepositorio.AnticipoListadoProjection> listar(
            @RequestParam(value = "idCliente", required = false) Long idCliente,
            @RequestParam(value = "desde", required = false) String desdeStr,
            @RequestParam(value = "hasta", required = false) String hastaStr,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        java.time.LocalDateTime desde = (desdeStr == null || desdeStr.isBlank()) ? null : java.time.LocalDateTime.parse(desdeStr);
        java.time.LocalDateTime hasta = (hastaStr == null || hastaStr.isBlank()) ? null : java.time.LocalDateTime.parse(hastaStr);
        return consultaServicio.listar(idCliente, desde, hasta, pageable);
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

    @GetMapping("/{id}")
    public Anticipo obtener(@PathVariable Long id) {
        return consultaServicio.obtener(id);
    }

}
