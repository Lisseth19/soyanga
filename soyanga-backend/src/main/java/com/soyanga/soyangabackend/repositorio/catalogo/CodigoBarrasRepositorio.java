package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.CodigoBarras;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface CodigoBarrasRepositorio extends BaseRepository<CodigoBarras, Long> {
    List<CodigoBarras> findByIdPresentacion(Long idPresentacion);
}
