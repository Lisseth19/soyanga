package com.soyanga.soyangabackend.web.finanzas;

import com.soyanga.soyangabackend.dto.catalogo.ConversionDTO;
import com.soyanga.soyangabackend.dto.finanzas.*;
import com.soyanga.soyangabackend.servicio.finanzas.TipoCambioServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/finanzas/tipos-cambio")
@RequiredArgsConstructor
public class TipoCambioControlador {

    private final TipoCambioServicio servicio;

    @GetMapping("/vigente")
    public TipoCambioRespuestaDTO vigente(
            @RequestParam Long idMonedaOrigen,
            @RequestParam Long idMonedaDestino,
            @RequestParam(required = false) LocalDate fecha
    ) {
        return servicio.vigente(idMonedaOrigen, idMonedaDestino, fecha);
    }

    @PostMapping
    public TipoCambioRespuestaDTO crear(@Valid @RequestBody TipoCambioCrearDTO dto) {
        return servicio.crear(dto);
    }

    @GetMapping
    public Page<TipoCambioRespuestaDTO> historial(
            @RequestParam(required = false) Long idMonedaOrigen,
            @RequestParam(required = false) Long idMonedaDestino,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaVigencia").descending());
        return servicio.historial(idMonedaOrigen, idMonedaDestino, pageable);
    }

    @GetMapping("/convertir")
    public ConversionDTO convertir(@RequestParam Long idMonedaOrigen,
                                   @RequestParam Long idMonedaDestino,
                                   @RequestParam java.math.BigDecimal monto) {
        return servicio.convertir(idMonedaOrigen, idMonedaDestino, monto);
    }
}
