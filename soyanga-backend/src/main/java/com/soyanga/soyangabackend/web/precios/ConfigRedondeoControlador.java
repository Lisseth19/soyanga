// com.soyanga.soyangabackend.web.precios.ConfigRedondeoControlador.java
package com.soyanga.soyangabackend.web.precios;

import com.soyanga.soyangabackend.dto.precios.ConfigRedondeoDTO;
import com.soyanga.soyangabackend.servicio.precios.ConfigRedondeoServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/precios/redondeo")
@RequiredArgsConstructor
public class ConfigRedondeoControlador {

    private final ConfigRedondeoServicio servicio;

    @GetMapping
    public ConfigRedondeoDTO get() {
        return servicio.get();
    }

    @PutMapping
    public ConfigRedondeoDTO update(@RequestBody ConfigRedondeoDTO dto,
            @RequestHeader(value = "X-Usuario", required = false) String usuario) {
        return servicio.update(dto, usuario != null ? usuario : "ui");
    }
}
