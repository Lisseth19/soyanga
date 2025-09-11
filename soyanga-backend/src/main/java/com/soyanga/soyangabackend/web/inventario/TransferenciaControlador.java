package com.soyanga.soyangabackend.web.inventario;

import com.soyanga.soyangabackend.dto.inventario.TransferenciaCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaListadoProjection;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaRespuestaDTO;
import com.soyanga.soyangabackend.servicio.inventario.TransferenciaConsultaServicio;
import com.soyanga.soyangabackend.servicio.inventario.TransferenciaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventario/transferencias")
@RequiredArgsConstructor
public class TransferenciaControlador {

    private final TransferenciaServicio servicio;
    private final TransferenciaConsultaServicio consultaServicio;

    // LISTADO con filtros
    @GetMapping
    public Page<TransferenciaListadoProjection> listar(
            @RequestParam(required = false) String estado,       // pendiente | en_transito | completada | anulada
            @RequestParam(required = false) Long origenId,
            @RequestParam(required = false) Long destinoId,
            @RequestParam(required = false) String desde,        // YYYY-MM-DD
            @RequestParam(required = false) String hasta,        // YYYY-MM-DD
            Pageable pageable
    ) {
        return consultaServicio.listar(estado, origenId, destinoId, desde, hasta, pageable);
    }

    // ONE-STEP: crea y completa
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransferenciaRespuestaDTO transferirYCompletar(@Valid @RequestBody TransferenciaCrearDTO dto) {
        return servicio.transferirYCompletar(dto);
    }

    // TWO-STEP: crea en pendiente
    @PostMapping("/pendiente")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferenciaRespuestaDTO crearPendiente(@Valid @RequestBody TransferenciaCrearDTO dto) {
        return servicio.crearPendiente(dto);
    }

    // TWO-STEP: confirmar salida -> en_transito
    @PostMapping("/{id}/salida")
    public TransferenciaRespuestaDTO confirmarSalida(@PathVariable Long id) {
        return servicio.confirmarSalida(id);
    }

    // TWO-STEP: confirmar ingreso -> completada
    @PostMapping("/{id}/ingreso")
    public TransferenciaRespuestaDTO confirmarIngreso(@PathVariable Long id) {
        return servicio.confirmarIngreso(id);
    }
    @GetMapping("/{id}")
    public com.soyanga.soyangabackend.dto.inventario.TransferenciaDetalleDTO detalle(@PathVariable Long id) {
        return consultaServicio.detalle(id);
    }
    @PostMapping("/{id}/anular")
    public TransferenciaRespuestaDTO anular(
            @PathVariable Long id,
            @RequestParam(required = false) String motivo
    ) {
        return servicio.anular(id, motivo);
    }

}
