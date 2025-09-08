package com.soyanga.soyangabackend.web.clientes;

import com.soyanga.soyangabackend.dto.clientes.ClienteCrearDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteEditarDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteRespuestaDTO;
import com.soyanga.soyangabackend.servicio.clientes.ClienteServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteControlador {

    private final ClienteServicio servicio;

    @GetMapping
    public Page<ClienteRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean soloActivos,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size);
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    public ClienteRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    public ClienteRespuestaDTO crear(@Valid @RequestBody ClienteCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    public ClienteRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody ClienteEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
