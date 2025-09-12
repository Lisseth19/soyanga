package com.soyanga.soyangabackend.web.inventario;

import com.soyanga.soyangabackend.dto.inventario.InventarioPorLoteResponse;
import com.soyanga.soyangabackend.servicio.inventario.InventarioLotesConsultaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/inventario/lotes")
@RequiredArgsConstructor
public class InventarioLotesControlador {

    private final InventarioLotesConsultaServicio servicio;

    @GetMapping
    public Page<InventarioPorLoteResponse> listar(
            @RequestParam(required = false) Long almacenId,
            @RequestParam(required = false, name = "q") String textoProductoOSku,
            @RequestParam(required = false) LocalDate venceAntes,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size);
        return servicio.listar(almacenId, textoProductoOSku, venceAntes, pageable);
    }
}
