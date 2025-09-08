package com.soyanga.soyangabackend.servicio.catalogo.impl;

import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.repositorio.catalogo.AlmacenRepositorio;
import com.soyanga.soyangabackend.servicio.catalogo.AlmacenServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AlmacenServicioImpl implements AlmacenServicio {

    private final AlmacenRepositorio repo;

    @Override
    public List<OpcionIdNombre> listarOpciones(boolean soloActivos) {
        return repo.opciones(soloActivos);
    }
}
