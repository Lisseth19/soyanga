package com.soyanga.soyangabackend.web.compras;

import com.soyanga.soyangabackend.dto.compras.RecepcionCrearDTO;
import com.soyanga.soyangabackend.dto.compras.RecepcionRespuestaDTO;
import com.soyanga.soyangabackend.dto.compras.RecepcionCabeceraDTO;
import com.soyanga.soyangabackend.dto.compras.RecepcionDetalladaDTO;
import com.soyanga.soyangabackend.servicio.compras.RecepcionServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/compras/recepciones")
@RequiredArgsConstructor
public class RecepcionControlador {

    private final RecepcionServicio servicio;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecepcionRespuestaDTO crear(@Valid @RequestBody RecepcionCrearDTO dto) {
        return servicio.registrar(dto);
    }

    @PatchMapping("/{id}/cerrar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cerrar(@PathVariable Long id) {
        servicio.cerrar(id);
    }

    // ⬇⬇⬇ NUEVO: listar por id de compra (o todas si no se envía)
    @GetMapping
    public List<RecepcionCabeceraDTO> listar(@RequestParam(value = "compraId", required = false) Long compraId) {
        return servicio.listarCabeceras(compraId);
    }

    // ⬇⬇⬇ NUEVO: obtener una recepción con sus items (detalle + lote)
    @GetMapping("/{id}")
    public RecepcionDetalladaDTO obtener(@PathVariable Long id) {
        return servicio.obtenerDetallada(id);
    }
}
