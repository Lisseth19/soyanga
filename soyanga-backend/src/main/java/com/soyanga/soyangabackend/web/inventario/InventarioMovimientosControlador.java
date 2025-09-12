package com.soyanga.soyangabackend.web.inventario;

import com.soyanga.soyangabackend.dto.inventario.MovimientoInventarioResponse;
import com.soyanga.soyangabackend.servicio.inventario.MovimientoInventarioConsultaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventario")
@RequiredArgsConstructor
public class InventarioMovimientosControlador {

    private final MovimientoInventarioConsultaServicio servicio;

    @GetMapping("/lotes/{loteId}/movimientos")
    public List<MovimientoInventarioResponse> ultimos(
            @PathVariable Long loteId,
            @RequestParam(required = false) Long almacenId,
            @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        return servicio.ultimos(loteId, almacenId, limit);
    }
}
