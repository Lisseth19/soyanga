// com.soyanga.soyangabackend.web.precios.ReglasPreciosControlador.java
package com.soyanga.soyangabackend.web.precios;

import com.soyanga.soyangabackend.dto.precios.*;
import com.soyanga.soyangabackend.servicio.precios.ReglasPreciosServicio;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;

import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/precios")
@RequiredArgsConstructor
public class ReglasPreciosControlador {

    private final ReglasPreciosServicio servicio;
    private final com.soyanga.soyangabackend.servicio.precios.PrecioHistoricoServicio historicoSrv;

    @PostMapping("/recalcular")
    public ResumenRecalculoDTO recalcular(
            @RequestParam Long idMonedaOrigen,
            @RequestParam Long idMonedaDestino,
            @RequestParam(defaultValue = "false") boolean simular,
            @RequestParam(required = false) String motivo,
            @org.springframework.format.annotation.DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(required = false, name = "fechaVigencia") LocalDate fechaVigencia) {
        return servicio.recalcularMasivo(idMonedaOrigen, idMonedaDestino, simular, motivo, fechaVigencia);
    }

    @PostMapping("/presentaciones/{id}/manual")
    public void manual(@PathVariable Long id, @RequestBody PrecioNuevoDTO dto) {
        servicio.cambioManual(id, dto.getPrecioVentaBob(), dto.getMotivoCambio(), dto.getFechaInicioVigencia());
    }

    @GetMapping("/presentaciones/{id}/historico")
    public Page<PrecioHistoricoDTO> historico(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return historicoSrv.listar(id, PageRequest.of(page, size));
    }

    @PostMapping("/revertir/{idHistorico}")
    public void revertir(@PathVariable Long idHistorico) {
        servicio.revertir(idHistorico);
    }
}
