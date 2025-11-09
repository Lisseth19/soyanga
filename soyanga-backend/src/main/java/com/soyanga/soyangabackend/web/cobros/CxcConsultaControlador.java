package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dto.cobros.CxcDetalleDTO;
import com.soyanga.soyangabackend.dto.cobros.CxcListadoProjection;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.servicio.cobros.CxcConsultaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/cobros")
@RequiredArgsConstructor
public class CxcConsultaControlador {
    private final CxcConsultaServicio cxcConsultaServicio;
    private final CuentaPorCobrarRepositorio cxcRepo;

    @GetMapping("/cxc-por-venta")
    public ResponseEntity<?> porVenta(@RequestParam("ventaId") Long ventaId) {
        return cxcRepo.findByIdVenta(ventaId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build()); // 204 si no hay CxC
    }
    @GetMapping("/cxc")
    public Page<CxcListadoProjection> listar(
            @RequestParam(defaultValue = "true") boolean soloAbiertas,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate emisionDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate emisionHasta,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate venceAntes,
            Pageable pageable
    ) {
        return cxcRepo.buscarCxc(soloAbiertas, clienteId, emisionDesde, emisionHasta, venceAntes, pageable);
    }


    @GetMapping("/cxc/{id}/detalle")
    public CxcDetalleDTO detalle(@PathVariable Long id) {
        return cxcConsultaServicio.detalleCxc(id);
    }

    @GetMapping("/cxc/detalle-por-venta")
    public ResponseEntity<CxcDetalleDTO> detallePorVenta(@RequestParam("ventaId") Long ventaId) {
        return cxcRepo.findByIdVenta(ventaId)
                .map(cxc -> ResponseEntity.ok(
                        cxcConsultaServicio.detalleCxc(cxc.getIdCuentaCobrar())
                ))
                .orElseGet(() -> ResponseEntity.noContent().build()); // 204 si no hay CxC para esa venta
    }


}
