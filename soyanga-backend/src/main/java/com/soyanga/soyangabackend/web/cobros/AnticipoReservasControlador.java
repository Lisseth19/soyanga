package com.soyanga.soyangabackend.web.cobros;

import com.soyanga.soyangabackend.dto.cobros.LiberarReservaAnticipoDTO;
import com.soyanga.soyangabackend.dto.cobros.ReservaAnticipoDTO;
import com.soyanga.soyangabackend.dto.cobros.ReservaAnticipoRespuestaDTO;
import com.soyanga.soyangabackend.servicio.cobros.ReservaAnticipoServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/anticipos")
@RequiredArgsConstructor
public class AnticipoReservasControlador {

    private final ReservaAnticipoServicio servicio;

    /** POST /api/v1/anticipos/{id}/reservas  -> Reservar (acepta pedir sin stock disponible) */
    @PostMapping("/{id}/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservaAnticipoRespuestaDTO reservar(
            @PathVariable("id") Long idAnticipo,
            @Valid @RequestBody ReservaAnticipoDTO dto,
            @RequestParam(name = "permitirSinStock", defaultValue = "false") boolean permitirSinStock
    ) {
        return servicio.reservar(idAnticipo, dto, permitirSinStock); // <-- usar 'servicio'
    }




    /** POST /api/v1/anticipos/{id}/reservas/liberar  -> Liberar parcialmente */
    @PostMapping("/{id}/reservas/liberar")
    public ReservaAnticipoRespuestaDTO liberar(@PathVariable Long id,
                                               @Valid @RequestBody LiberarReservaAnticipoDTO dto) {
        return servicio.liberar(id, dto);
    }

    /** POST /api/v1/anticipos/{id}/reservas/liberar-todo  -> Liberar todas las reservas */
    @PostMapping("/{id}/reservas/liberar-todo")
    public Map<String, Object> liberarTodo(@PathVariable Long id) {
        return servicio.liberarTodo(id);
    }

    /** GET /api/v1/anticipos/{id}/reservas/detalle  -> Ver reservas vigentes (con lotes y FEFO) */
    @GetMapping("/{id}/reservas/detalle")
    public ReservaAnticipoRespuestaDTO verDetalle(@PathVariable Long id) {
        return servicio.verReservas(id);
    }
}
