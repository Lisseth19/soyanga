// src/main/java/com/soyanga/soyangabackend/servicio/cobros/AnticipoConsultaServicio.java
package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio.AnticipoListadoProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AnticipoConsultaServicio {
    private final AnticipoRepositorio repo;

    public Page<AnticipoListadoProjection> listar(Long idCliente, LocalDateTime desde, LocalDateTime hasta, Pageable pageable) {
        return repo.listar(idCliente, desde, hasta, pageable);

    }

    public Anticipo obtener(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + id));
    }

}
