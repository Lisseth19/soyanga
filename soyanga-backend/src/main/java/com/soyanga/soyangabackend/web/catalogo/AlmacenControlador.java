package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.dto.common.EstadoRequest;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.servicio.catalogo.AlmacenServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/almacenes")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'almacenes:ver')") // TODOS los GET requieren almacenes:ver
public class AlmacenControlador {

    private final AlmacenServicio servicio;

    @GetMapping
    public Page<AlmacenListadoProjection> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idSucursal,
            @RequestParam(required = false) Boolean incluirInactivos,
            @RequestParam(required = false) Boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        boolean incluir = (incluirInactivos != null)
                ? incluirInactivos
                : (soloActivos != null ? !soloActivos : false);

        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, idSucursal, incluir, pageable);
    }

    @GetMapping("/{id}")
    public AlmacenRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @GetMapping("/opciones")
    public List<OpcionIdNombre> opciones(
            @RequestParam(required = false) Boolean incluirInactivos,
            @RequestParam(required = false) Boolean soloActivos,
            @RequestParam(required = false) Long idSucursal
    ) {
        boolean incluir = (incluirInactivos != null)
                ? incluirInactivos
                : (soloActivos != null ? !soloActivos : false);

        return servicio.opciones(incluir, idSucursal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'almacenes:crear')")
    public AlmacenRespuestaDTO crear(@Valid @RequestBody AlmacenCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'almacenes:actualizar')")
    public AlmacenRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody AlmacenEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @PatchMapping("/{id}/estado")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'almacenes:actualizar')")
    public void cambiarEstado(@PathVariable Long id, @RequestBody EstadoRequest req) {
        boolean activo = Boolean.TRUE.equals(req.activo());
        servicio.cambiarEstado(id, activo);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'almacenes:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
