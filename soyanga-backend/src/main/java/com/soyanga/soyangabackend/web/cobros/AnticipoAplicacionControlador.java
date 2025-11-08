package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dto.cobros.AplicarAnticipoDTO;
import com.soyanga.soyangabackend.dto.cobros.AplicarAnticipoRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionAnticipoRepositorio;
import com.soyanga.soyangabackend.servicio.cobros.AnticipoAplicacionServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/anticipos")
@RequiredArgsConstructor
public class AnticipoAplicacionControlador {

    private final AnticipoAplicacionServicio servicio;
    private final AplicacionAnticipoRepositorio aplicacionRepo;

    @PostMapping("/{id}/aplicar")
    @ResponseStatus(HttpStatus.CREATED)
    public AplicarAnticipoRespuestaDTO aplicar(
            @PathVariable Long id,
            @Valid @RequestBody AplicarAnticipoDTO dto) {
        return servicio.aplicar(id, dto);
    }

    @GetMapping("/{id}/aplicaciones")
    public org.springframework.data.domain.Page<com.soyanga.soyangabackend.dominio.AplicacionAnticipo> listarAplicaciones(
            @PathVariable("id") Long idAnticipo,
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        return aplicacionRepo.listarPorAnticipo(idAnticipo, pageable);
    }
}
