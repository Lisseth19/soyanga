package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.dto.cobros.*;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.servicio.cobros.AnticipoAplicacionServicio;
import com.soyanga.soyangabackend.servicio.cobros.AnticipoConsultaServicio;
import com.soyanga.soyangabackend.servicio.cobros.ReservaAnticipoServicio;
import com.soyanga.soyangabackend.servicio.cobros.AnticipoConversionServicio;

import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/anticipos")
@RequiredArgsConstructor
public class AnticipoControlador {

    private final ReservaAnticipoServicio reservaServicio;
    private final AnticipoConsultaServicio consultaServicio;
    private final AnticipoAplicacionServicio aplicacionServicio;

    // NUEVO
    private final AnticipoConversionServicio conversionServicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> crear(@Valid @RequestBody AnticipoCrearDTO dto) {
        return reservaServicio.crearAnticipo(dto);
    }

    @GetMapping
    public Page<AnticipoRepositorio.AnticipoListadoProjection> listar(
            @RequestParam(value = "idCliente", required = false) Long idCliente,
            @RequestParam(value = "desde", required = false) String desdeStr,
            @RequestParam(value = "hasta", required = false) String hastaStr,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        java.time.LocalDateTime desde = (desdeStr == null || desdeStr.isBlank()) ? null : java.time.LocalDateTime.parse(desdeStr);
        java.time.LocalDateTime hasta = (hastaStr == null || hastaStr.isBlank()) ? null : java.time.LocalDateTime.parse(hastaStr);
        return consultaServicio.listar(idCliente, desde, hasta, pageable);
    }

    @GetMapping("/{id}")
    public Anticipo obtener(@PathVariable Long id) {
        return consultaServicio.obtener(id);
    }

    @GetMapping("/{id}/reservas")
    public ReservaAnticipoRespuestaDTO reservasVigentes(@PathVariable("id") Long idAnticipo) {
        return reservaServicio.reservasVigentes(idAnticipo);
    }

    @GetMapping("/{id}/reservas/historico")
    public ReservaAnticipoRespuestaDTO verReservasHistorico(@PathVariable("id") Long idAnticipo) {
        return reservaServicio.verReservas(idAnticipo);
    }

    // ====== CONVERSIÓN: consumir reservas + aplicar anticipo sobre una VENTA existente ======
    // ÚNICO endpoint soportado: decide "contado"/"crédito" según la venta.
    @PostMapping("/{id}/convertir-en-venta")
    @ResponseStatus(HttpStatus.OK)
    public Map<String,Object> convertirEnVenta(@PathVariable("id") Long idAnticipo,
                                               @RequestBody ConvertirEnVentaReq body) {
        return conversionServicio.convertirEnVenta(idAnticipo, body.getIdVenta(), body.getMontoAplicarBob());
    }

    // ====== DTO del body ======
    @Data
    public static class ConvertirEnVentaReq {
        private Long idVenta;                 // obligatorio
        private BigDecimal montoAplicarBob;   // opcional (null => aplica todo el saldo disponible, limitado por pendiente)
    }
}
