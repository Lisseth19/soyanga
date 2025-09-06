package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cobros")
@RequiredArgsConstructor
public class CxcConsultaControlador {

    private final CuentaPorCobrarRepositorio cxcRepo;

    @GetMapping("/cxc-por-venta")
    public ResponseEntity<?> porVenta(@RequestParam("ventaId") Long ventaId) {
        return cxcRepo.findByIdVenta(ventaId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build()); // 204 si no hay CxC
    }
}
