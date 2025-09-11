package com.soyanga.soyangabackend.web.precios;

import com.soyanga.soyangabackend.dto.impuestos.*;
import com.soyanga.soyangabackend.servicio.precios.ImpuestoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/precios/impuestos")
@RequiredArgsConstructor
public class ImpuestoControlador {

    private final ImpuestoServicio servicio;

    @GetMapping
    public Page<ImpuestoRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("nombreImpuesto").ascending());
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public ImpuestoRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ImpuestoRespuestaDTO crear(@Valid @RequestBody ImpuestoCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public ImpuestoRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody ImpuestoEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    @PatchMapping("/{id}/activar")
    public ImpuestoRespuestaDTO activar(@PathVariable Long id) {
        return servicio.activar(id);
    }

    @PatchMapping("/{id}/desactivar")
    public ImpuestoRespuestaDTO desactivar(@PathVariable Long id) {
        return servicio.desactivar(id);
    }
}
