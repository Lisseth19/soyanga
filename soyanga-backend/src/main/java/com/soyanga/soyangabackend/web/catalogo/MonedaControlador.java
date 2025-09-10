package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.MonedaServicio;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/v1/catalogo/monedas")
public class MonedaControlador {

    private final MonedaServicio servicio;
    public MonedaControlador(MonedaServicio servicio) { this.servicio = servicio; }

    // Listado paginado con búsqueda/orden/filtro de activos
    @GetMapping
    public Page<MonedaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean activos,
            @PageableDefault(size = 20, sort = "nombreMoneda", direction = Sort.Direction.ASC)
            Pageable pageable
    ) {
        return servicio.listar(q, activos, pageable);
    }

    // Solo NO locales con su TC (para Postman)
    @GetMapping("/no-locales")
    public List<MonedaDTO> listarNoLocalesConTC(
            @RequestParam(required = false) Boolean activos,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha
    ) {
        return servicio.listarNoLocalesConTC(activos, fecha);
    }

    // Moneda local (única)
    @GetMapping("/local")
    public MonedaDTO obtenerLocal() {
        return servicio.obtenerLocal();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MonedaDTO crear(@Valid @RequestBody MonedaCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public MonedaDTO actualizar(@PathVariable Long id, @Valid @RequestBody MonedaActualizarDTO dto) {
        return servicio.actualizar(id, dto);
    }

    @PatchMapping("/{id}/estado")
    public MonedaDTO cambiarEstado(@PathVariable Long id, @RequestParam boolean activo) {
        return servicio.cambiarEstado(id, activo);
    }

    // "Eliminar" = inhabilitar si no es local
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
