// com.soyanga.soyangabackend.web.precios.HistoricoConsultaControlador.java
package com.soyanga.soyangabackend.web.precios;

import com.soyanga.soyangabackend.dto.precios.FiltroHistoricoDTO;
import com.soyanga.soyangabackend.dto.precios.PrecioHistoricoDTO;
import com.soyanga.soyangabackend.servicio.precios.HistoricoConsultaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/precios/historico")
@RequiredArgsConstructor
public class HistoricoConsultaControlador {

    private final HistoricoConsultaServicio servicio;

    @PostMapping("/buscar")
    public Page<PrecioHistoricoDTO> buscar(@RequestBody FiltroHistoricoDTO filtro,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return servicio.buscar(filtro, PageRequest.of(page, size));
    }
}
