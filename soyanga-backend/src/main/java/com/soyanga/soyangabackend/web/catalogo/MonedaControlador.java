package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.servicio.catalogo.MonedaServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/monedas")
@RequiredArgsConstructor
public class MonedaControlador {

    private final MonedaServicio servicio;

    // Listado paginado con búsqueda/orden/filtro de activos
    @GetMapping
    @PreAuthorize("@perms.tiene(authentication, 'monedas:ver')")
    public Page<MonedaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean activos,
            @PageableDefault(size = 20, sort = "nombreMoneda") Pageable pageable) {
        return servicio.listar(q, activos, pageable);
    }

    // Solo NO locales con su TC
    @GetMapping("/no-locales")
    @PreAuthorize("@perms.tiene(authentication, 'monedas:ver')")
    public List<MonedaDTO> listarNoLocalesConTC(
            @RequestParam(required = false) Boolean activos,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return servicio.listarNoLocalesConTC(activos, fecha);
    }

    // Moneda local (única)
    @GetMapping("/local")
    @PreAuthorize("@perms.tiene(authentication, 'monedas:ver')")
    public MonedaDTO obtenerLocal() {
        return servicio.obtenerLocal();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'monedas:crear')")
    public MonedaDTO crear(@Valid @RequestBody MonedaCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'monedas:actualizar')")
    public MonedaDTO actualizar(@PathVariable Long id, @Valid @RequestBody MonedaActualizarDTO dto) {
        return servicio.actualizar(id, dto);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("@perms.tiene(authentication, 'monedas:cambiar-estado')")
    public MonedaDTO cambiarEstado(@PathVariable Long id, @RequestParam boolean activo) {
        return servicio.cambiarEstado(id, activo);
    }

    // "Eliminar" = inhabilitar si no es local
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'monedas:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
