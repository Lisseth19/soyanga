package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.precios.PrecioHistoricoDTO;
import com.soyanga.soyangabackend.dto.precios.PrecioNuevoDTO;
import com.soyanga.soyangabackend.servicio.precios.PrecioHistoricoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalogo/presentaciones/{idPresentacion}/precios")
@RequiredArgsConstructor
public class PrecioPresentacionControlador {

    private final PrecioHistoricoServicio precioServicio;

    // Historial paginado
    @GetMapping
    public Page<PrecioHistoricoDTO> listar(@PathVariable Long idPresentacion,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("fechaInicioVigencia").descending());
        return precioServicio.listar(idPresentacion, pageable);
    }

    // Precio vigente
    @GetMapping("/vigente")
    public PrecioHistoricoDTO vigente(@PathVariable Long idPresentacion) {
        return precioServicio.vigente(idPresentacion);
    }

    // Crear nuevo (cierra vigente si existe)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrecioHistoricoDTO crear(@PathVariable Long idPresentacion,
                                    @Valid @RequestBody PrecioNuevoDTO dto) {
        return precioServicio.crearNuevo(idPresentacion, dto);
    }
}
