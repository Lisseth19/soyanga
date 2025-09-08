package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.RecepcionDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface RecepcionDetalleRepositorio extends BaseRepository<RecepcionDetalle, Long> {
    List<RecepcionDetalle> findByIdRecepcion(Long idRecepcion);
}
