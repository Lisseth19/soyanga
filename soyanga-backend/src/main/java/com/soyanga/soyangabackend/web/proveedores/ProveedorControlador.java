package com.soyanga.soyangabackend.web.proveedores;

import com.soyanga.soyangabackend.dto.proveedores.*;
import com.soyanga.soyangabackend.servicio.proveedores.ProveedorServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/proveedores")
@RequiredArgsConstructor
public class ProveedorControlador {

    private final ProveedorServicio servicio;

    @GetMapping
    public Page<ProveedorRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean soloActivos,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size); // sin Sort: ORDER BY está en el SQL
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public ProveedorRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    public ProveedorRespuestaDTO crear(@Valid @RequestBody ProveedorCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public ProveedorRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody ProveedorEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
