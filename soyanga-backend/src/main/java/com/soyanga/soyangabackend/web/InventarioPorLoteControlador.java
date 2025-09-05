package com.soyanga.soyangabackend.web;

import com.soyanga.soyangabackend.dto.inventario.InventarioPorLoteResponse;
import com.soyanga.soyangabackend.servicio.inventario.InventarioPorLoteServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/inventario/por-lote")
@RequiredArgsConstructor
public class InventarioPorLoteControlador {

    private final InventarioPorLoteServicio servicio;

    @GetMapping
    public Page<InventarioPorLoteResponse> listar(
            @RequestParam(required = false) Long almacenId,
            @RequestParam(required = false) String producto,  // texto: SKU o nombre
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate venceAntes,
            @PageableDefault(size = 20, sort = {"vencimiento","sku"}) Pageable pageable
    ) {
        return servicio.listar(almacenId, producto, venceAntes, pageable);
    }
}
