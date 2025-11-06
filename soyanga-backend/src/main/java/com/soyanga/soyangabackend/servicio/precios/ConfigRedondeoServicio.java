// com.soyanga.soyangabackend.servicio.precios.ConfigRedondeoServicio.java
package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dominio.ConfiguracionPrecios;
import com.soyanga.soyangabackend.dto.precios.ConfigRedondeoDTO;
import com.soyanga.soyangabackend.repositorio.precios.ConfiguracionPreciosRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ConfigRedondeoServicio {

    private final ConfiguracionPreciosRepositorio repo;

    public ConfigRedondeoDTO get() {
        var c = repo.unica();
        if (c == null)
            return new ConfigRedondeoDTO("ENTERO", null, null);
        return new ConfigRedondeoDTO(c.getModo(), c.getMultiplo(), c.getDecimales());
    }

    @Transactional
    public ConfigRedondeoDTO update(ConfigRedondeoDTO dto, String usuario) {
        if ("MULTIPLO".equalsIgnoreCase(dto.getModo())) {
            if (dto.getMultiplo() == null || dto.getMultiplo().signum() <= 0) {
                throw new IllegalArgumentException("multiplo debe ser > 0 cuando modo = MULTIPLO");
            }
        }
        if ("DECIMALES".equalsIgnoreCase(dto.getModo())) {
            Integer d = dto.getDecimales() == null ? 0 : dto.getDecimales();
            if (d < 0 || d > 6) {
                throw new IllegalArgumentException("decimales debe estar entre 0 y 6");
            }
        }

        var c = repo.unica();
        if (c == null)
            c = new ConfiguracionPrecios();
        c.setModo(dto.getModo() != null ? dto.getModo().toUpperCase() : "ENTERO");
        c.setMultiplo(dto.getMultiplo());
        c.setDecimales(dto.getDecimales());
        c.setActualizadoPor(usuario);
        c.setActualizadoEn(LocalDateTime.now());
        repo.save(c);
        return get();
    }
}
