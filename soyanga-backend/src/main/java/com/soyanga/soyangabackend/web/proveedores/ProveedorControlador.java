package com.soyanga.soyangabackend.web.proveedores;

import com.soyanga.soyangabackend.dto.proveedores.*;
import com.soyanga.soyangabackend.servicio.proveedores.ProveedorServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/proveedores")
@RequiredArgsConstructor
public class ProveedorControlador {

    private final ProveedorServicio servicio;

    /* ===== LECTURA ===== */
    @GetMapping
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:ver')")
    public Page<ProveedorRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size); // ORDER BY ya está en tu SQL
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:ver')")
    public ProveedorRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    /* ===== CREAR ===== */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:crear')")
    public ProveedorRespuestaDTO crear(@Valid @RequestBody ProveedorCrearDTO dto) {
        return servicio.crear(dto);
    }

    /* ===== ACTUALIZAR ===== */
    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:actualizar')")
    public ProveedorRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody ProveedorEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    /* ===== ACTIVAR / DESACTIVAR ===== */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:actualizar')")
    public ProveedorRespuestaDTO cambiarEstado(@PathVariable Long id, @Valid @RequestBody ProveedorEstadoDTO dto) {
        // dto.activo = true/false
        return servicio.cambiarEstado(id, dto);
    }

    /* ===== ELIMINAR ===== */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    /* ===== OPCIONAL: opciones para combos (id, nombre) ===== */
    @GetMapping("/opciones")
    @PreAuthorize("@perms.tiene(authentication, 'proveedores:ver')")
    public List<Opcion> opciones(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1000") int size
    ) {
        Page<ProveedorRespuestaDTO> page =
                servicio.listar(q, true, PageRequest.of(0, Math.max(1, size)));
        return page.map(p -> new Opcion(p.getIdProveedor(), p.getRazonSocial())).getContent();
    }

    /* DTO simple para /opciones */
    public static class Opcion {
        private final Long id;
        private final String nombre;
        public Opcion(Long id, String nombre) { this.id = id; this.nombre = nombre; }
        public Long getId() { return id; }
        public String getNombre() { return nombre; }
    }
}
