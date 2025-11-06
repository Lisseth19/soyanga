package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.common.EstadoRequest;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.dto.sucursales.SucursalCrearDTO;
import com.soyanga.soyangabackend.dto.sucursales.SucursalEditarDTO;
import com.soyanga.soyangabackend.dto.sucursales.SucursalRespuestaDTO;
import com.soyanga.soyangabackend.servicio.catalogo.SucursalServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/sucursales")
@RequiredArgsConstructor
@PreAuthorize("@perms.tiene(authentication, 'sucursales:ver')") // TODOS los GET requieren sucursales:ver
public class SucursalControlador {

    private final SucursalServicio servicio;

    @GetMapping
    public Page<SucursalRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String ciudad,
            @RequestParam(required = false) Boolean incluirInactivos,
            @RequestParam(required = false) Boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        // Igual que en Almacenes: si envías soloActivos=true => incluirInactivos=false
        boolean incluir = (incluirInactivos != null)
                ? incluirInactivos
                : (soloActivos != null ? !soloActivos : false);

        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, ciudad, incluir, pageable);
    }

    @GetMapping("/{id}")
    public SucursalRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @GetMapping("/opciones")
    public List<OpcionIdNombre> opciones(
            @RequestParam(required = false) Boolean incluirInactivos,
            @RequestParam(required = false) Boolean soloActivos
    ) {
        boolean incluir = (incluirInactivos != null)
                ? incluirInactivos
                : (soloActivos != null ? !soloActivos : false);

        return servicio.opciones(incluir);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'sucursales:crear')")
    public SucursalRespuestaDTO crear(@Valid @RequestBody SucursalCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'sucursales:actualizar')")
    public SucursalRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody SucursalEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @PatchMapping("/{id}/estado")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'sucursales:actualizar')")
    public void cambiarEstado(@PathVariable Long id, @RequestBody EstadoRequest req) {
        boolean activo = Boolean.TRUE.equals(req.activo());
        servicio.cambiarEstado(id, activo);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'sucursales:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
