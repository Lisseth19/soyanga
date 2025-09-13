package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.AlmacenCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenEditarDTO;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenListadoProjection;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenRespuestaDTO;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.servicio.catalogo.AlmacenServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.soyanga.soyangabackend.dto.common.EstadoRequest;
import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo/almacenes")
@RequiredArgsConstructor
public class AlmacenControlador {

    private final AlmacenServicio servicio;

    @GetMapping
    public Page<AlmacenListadoProjection> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idSucursal,
            // nuevo nombre (checkbox "Mostrar inactivos")
            @RequestParam(required = false) Boolean incluirInactivos,
            // compat temporal con el viejo nombre (inverso)
            @RequestParam(required = false) Boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // Regla: default = false (NO incluir inactivos) => solo activos
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AlmacenRespuestaDTO crear(@Valid @RequestBody AlmacenCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public AlmacenRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody AlmacenEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    @GetMapping("/opciones")
    public List<OpcionIdNombre> opciones(
            @RequestParam(required = false) Boolean incluirInactivos,
            @RequestParam(required = false) Boolean soloActivos,
            @RequestParam(required = false) Long idSucursal) {

        boolean incluir = (incluirInactivos != null)
                ? incluirInactivos
                : (soloActivos != null ? !soloActivos : false);

        return servicio.opciones(incluir, idSucursal);
    }

    @PatchMapping("/{id}/estado")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cambiarEstado(@PathVariable Long id, @RequestBody EstadoRequest req) {
        // Si no viene nada, asumimos false para evitar NPE
        boolean activo = Boolean.TRUE.equals(req.activo());
        servicio.cambiarEstado(id, activo);
    }
}
