package com.soyanga.soyangabackend.web;

import com.soyanga.soyangabackend.dto.inventario.MovimientoInventarioResponse;
import com.soyanga.soyangabackend.servicio.inventario.MovimientoInventarioServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventario")
@RequiredArgsConstructor
public class InventarioMovimientosControlador {

    private final MovimientoInventarioServicio servicio;

    @GetMapping("/lotes/{loteId}/movimientos")
    public List<MovimientoInventarioResponse> ultimos(
            @PathVariable Long loteId,
            @RequestParam(required = false) Long almacenId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return servicio.ultimos(loteId, almacenId, limit);
    }
}
