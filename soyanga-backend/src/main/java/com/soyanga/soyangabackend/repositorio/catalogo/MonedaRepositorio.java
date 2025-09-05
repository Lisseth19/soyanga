package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Moneda;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.Optional;

public interface MonedaRepositorio extends BaseRepository<Moneda, Long> {
    Optional<Moneda> findByCodigoMoneda(String codigoMoneda);
}
